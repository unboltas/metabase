(ns metabase.task.send-pulses
  "Tasks related to running `Pulses`."
  (:require
   [clj-time.core :as time]
   [clj-time.predicates :as timepr]
   [clojure.string :as str]
   [clojurewerkz.quartzite.jobs :as jobs]
   [clojurewerkz.quartzite.schedule.cron :as cron]
   [clojurewerkz.quartzite.triggers :as triggers]
   [metabase.driver :as driver]
   [metabase.models.pulse :as pulse]
   [metabase.models.pulse-channel :as pulse-channel]
   [metabase.models.task-history :as task-history]
   [metabase.pulse]
   [metabase.task :as task]
   [metabase.util.cron :as u.cron]
   [metabase.util.log :as log]
   [metabase.util.malli :as mu]
   [toucan2.core :as t2])
  (:import
   (org.quartz
    CronTrigger
    JobDetail
    JobKey
    TriggerKey)))

(set! *warn-on-reflection* true)

;;; ------------------------------------------------- PULSE SENDING --------------------------------------------------

; Clearing pulse channels is not done synchronously in order to support undoing feature.
(defn- clear-pulse-channels!
  []
  (when-let [ids-to-delete (seq
                            (for [channel (t2/select [:model/PulseChannel :id :details]
                                                     :id [:not-in {:select   [[:pulse_channel_id :id]]
                                                                   :from     :pulse_channel_recipient
                                                                   :group-by [:pulse_channel_id]
                                                                   :having   [:>= :%count.* [:raw 1]]}])]
                              (when (and (empty? (get-in channel [:details :emails]))
                                         (not (get-in channel [:details :channel])))
                                (:id channel))))]
    (t2/delete! :model/PulseChannel :id [:in ids-to-delete])))

;;; ------------------------------------------------------ Task ------------------------------------------------------

(def ^:private send-pulse-job-key              (jobs/key "metabase.task.send-pulses.send-pulse.job"))
(def ^:private reprioritize-send-pulse-job-key (jobs/key "metabase.task.send-pulses.reprioritize.job"))

(defn- send-pulse-trigger-key
  [pulse-id schedule-map]
  (triggers/key (format "metabase.task.send-pulse.trigger.%d.%s"
                        pulse-id #p (-> schedule-map
                                        u.cron/schedule-map->cron-string
                                        (str/replace " " "_")))))

(defn ^:private send-pulse-trigger
  "Build a Quartz trigger to send a pulse."
  ^CronTrigger
  [pulse-id schedule-map pc-ids]
  (when (seq pc-ids)
   (triggers/build
      (triggers/with-identity (send-pulse-trigger-key pulse-id schedule-map))
      (triggers/for-job send-pulse-job-key)
      (triggers/using-job-data {"pulse-id"    pulse-id
                                "channel-ids" pc-ids})
      (triggers/with-schedule
        (cron/schedule
         (cron/cron-schedule (u.cron/schedule-map->cron-string schedule-map))
         ;; if we miss a sync for one reason or another (such as system being down) do not try to run the sync again.
         ;; Just wait until the next sync cycle.
         ;;
         ;; See https://www.nurkiewicz.com/2012/04/quartz-scheduler-misfire-instructions.html for more info
         (cron/with-misfire-handling-instruction-ignore-misfires))))))

(defn update-trigger-if-needed!
  "Replace or remove the existing trigger if the schedule changes.
  - Delete exsisting trigger if there are no channels to send to.
  - Replace existing trigger if the schedule or channels to send to change."
  ;; TODO maybe this should takes a pc-id then find alls other pcs that have the same schedule modify the trigger
  ([pulse-id schedule-map]
   (update-trigger-if-needed! pulse-id schedule-map
                              (pulse-channel/pulse-channels-same-slot pulse-id schedule-map)))
  ([pulse-id schedule-map pc-ids]
   (let [schedule-map (update-vals schedule-map
                                   #(if (keyword? %)
                                      (name %)
                                      %))
         job          (task/job-info send-pulse-job-key)
         trigger-key  (send-pulse-trigger-key pulse-id schedule-map)
         new-trigger  (send-pulse-trigger pulse-id schedule-map pc-ids)]
     (if-not (some? new-trigger)
       ;; if there are no channels to send to, remove the trigger
       (do
        (log/info "Delete trigger" trigger-key)
        (task/delete-trigger! trigger-key))
       (let [trigger-key-name          (.. new-trigger getKey getName)
             task-schedule             (u.cron/schedule-map->cron-string schedule-map)
             new-trigger-data          (.getJobDataMap new-trigger)
             ;; if there are no existing triggers with the same key, schedule and pc-ids
             ;; then we need to recreate the trigger
             need-to-recreate-trigger? (->> (:triggers job)
                                            (some #(when (and (= (:key %) trigger-key-name)
                                                              (= (:schedule %) task-schedule)
                                                              (= (:data %) new-trigger-data))
                                                     %)))]
         (if (nil? need-to-recreate-trigger?)
           (do
            (log/info "need to replace trigger")
            (task/delete-trigger! trigger-key)
            (task/add-trigger! new-trigger))
           (log/info "no op")))))))

(defn- send-pulse!
  [pulse-id channel-ids]
  (try
    (task-history/with-task-history {:task         "send-pulse"
                                     :task_details {:pulse-id pulse-id}}
      (log/debugf "Starting Pulse Execution: %d" pulse-id)
      (when-let [pulse (pulse/retrieve-notification pulse-id :archived false)]
        (metabase.pulse/send-pulse! pulse :channel-ids channel-ids))
      ;; TODO: clean up here too
      (log/debugf "Finished Pulse Execution: %d" pulse-id))
    (catch Throwable e
      (log/errorf e "Error sending Pulse %d to channel ids: %s" pulse-id (str/join ", " channel-ids)))))

(jobs/defjob ^{:doc "Triggers the sending of all pulses which are scheduled to run in the current hour"}
  SendPulse
  [{:keys [pulse-id channel-ids]}]
  (send-pulse! pulse-id channel-ids))

(defn- reprioritize-send-pulses
  []
  (let [pulse-channel-slots (as-> (t2/select :model/PulseChannel :enabled true) results
                              (group-by #(select-keys % [:pulse_id :schedule_type :schedule_day :schedule_hour :schedule_frame]) results)
                              (update-vals results #(map :id %)))]
    (for [[{:keys [pulse_id] :as schedule-map} pc-ids] pulse-channel-slots]
      (update-trigger-if-needed! pulse_id schedule-map pc-ids))
    (clear-pulse-channels!)))

(jobs/defjob ^{:doc "Triggers the sending of all pulses which are scheduled to run in the current hour"}
  RePrioritizeSendPulses
  [_job-context]
  (reprioritize-send-pulses))

(defmethod task/init! ::SendPulses [_]
  (let [send-pulse-job      (jobs/build
                             (jobs/with-description  "Send Pulse")
                             (jobs/of-type SendPulse)
                             (jobs/with-identity send-pulse-job-key)
                             (jobs/store-durably))
        re-proritize-job    (jobs/build
                             (jobs/with-description  "Update send Pulses Priority")
                             (jobs/of-type RePrioritizeSendPulses)
                             (jobs/with-identity reprioritize-send-pulse-job-key)
                             (jobs/store-durably))
        reproritize-trigger (triggers/build
                             (triggers/with-identity (triggers/key "metabase.task.send-pulses.reprioritize.trigger"))
                             (triggers/start-now)
                             (triggers/with-schedule
                               (cron/schedule
                                (cron/cron-schedule "0 0 1 ? * 7 *") ; at 1am on Saturday every week
                                (cron/with-misfire-handling-instruction-ignore-misfires))))]
    (task/add-job! send-pulse-job)
    (task/add-job! re-proritize-job)
    (task/add-trigger! reproritize-trigger)))

#_(let [trigger-names (map :key (:triggers (task/job-info send-pulse-job-key)))]
    (doseq [trigger trigger-names]
      (task/delete-trigger! (triggers/key trigger))))
(t2/delete! :model/Pulse)
#_(task/job-info send-pulse-job-key)
