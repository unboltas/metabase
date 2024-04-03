(ns metabase.query-processor.util.transformations.nest-expressions
  (:require
   [medley.core :as m]
   [metabase.lib.core :as lib]
   [metabase.lib.equality :as lib.equality]
   [metabase.lib.options :as lib.options]
   [metabase.lib.ref :as lib.ref]
   [metabase.lib.schema :as lib.schema]
   [metabase.lib.schema.metadata :as lib.schema.metadata]
   [metabase.lib.util.match :as lib.util.match]
   [metabase.lib.walk :as lib.walk]
   [metabase.query-processor.util.add-alias-info :as add]
   [metabase.query-processor.util.transformations.common :as qp.transformations.common]
   [metabase.util.log :as log]
   [metabase.util.malli :as mu]))

(def ^:private first-stage-keys
  #{:joins :expressions :source-table :source-card :sources})

(mu/defn ^:private new-first-stage :- ::lib.schema/stage
  [stage        :- ::lib.schema/stage
   used-columns :- [:sequential {:min 1} ::lib.schema.metadata/column]]
  (-> stage
      (select-keys (conj first-stage-keys :lib/type))
      (assoc :fields (into []
                           (keep (fn [col]
                                   (when-not (#{:source/aggregations} (:lib/source col))
                                     (lib/ref col))))
                           used-columns))))

(mu/defn ^:private new-second-stage :- ::lib.schema/stage
  [stage           :- ::lib.schema/stage
   visible-columns :- [:sequential ::lib.schema.metadata/column]]
  (let [stage                 (apply dissoc stage first-stage-keys)
        visible-expressions   (filter #(= (:lib/source %) :source/expressions)
                                      visible-columns)
        other-visible-columns (remove #(= (:lib/source %) :source/expressions)
                                      visible-columns)]
    (merge
     (select-keys stage [:lib/stage-metadata])
     (lib.util.match/replace (dissoc stage :lib/stage-metadata)
       #{:expression :field}
       (let [[tag] &match]
         (if-let [col (lib.equality/find-matching-column &match (case tag
                                                                  :expression visible-expressions
                                                                  :field      other-visible-columns))]
           (do
             (println "(pr-str &match):" (metabase.util/pprint-to-str &match)) ; NOCOMMIT
             (println "(pr-str col):" (metabase.util/pprint-to-str col))       ; NOCOMMIT
             (-> col
                 qp.transformations.common/update-aggregation-metadata-from-previous-stage-to-produce-correct-ref-in-current-stage
                 lib.ref/ref))
           (do
             (log/warnf "Error nesting expressions: cannot find match for clause %s" (pr-str &match))
             &match)))))))

(mu/defn ^:private nest-expressions-in-stage :- [:maybe [:sequential {:min 2, :max 2} ::lib.schema/stage]]
  [query :- ::lib.schema/query
   path  :- ::lib.walk/stage-path
   stage :- ::lib.schema/stage]
  (when (seq (:expressions stage))
    (let [#_returned-columns  #_(lib.walk/apply-f-for-stage-at-path lib/returned-columns query path stage) ; NOCOMMIT
          visible-columns   (lib.walk/apply-f-for-stage-at-path lib/visible-columns query path stage)
          _ (println "VISIBL" (metabase.util/pprint-to-str (map (juxt :lib/desired-column-alias :lib/source) visible-columns))) ; NOCOMMIT
          second-stage      (new-second-stage stage visible-columns)
          used-column-names (into #{} (lib.util.match/match second-stage
                                        [:field _opts field-name]
                                        field-name))
          _ (println "(pr-str used-column-names):" (pr-str used-column-names)) ; NOCOMMIT
          used-columns      (filter #(contains? used-column-names (:lib/desired-column-alias %))
                                    visible-columns)
          first-stage       (new-first-stage stage used-columns)]
      [first-stage second-stage])))

(mu/defn nest-expressions :- ::lib.schema/query
  "If any `:expressions` appear in a query stage, introduce another stage including just the `:expressions` and any
  `:joins`; update `:fields`, `:aggregation`, and `:breakout` to refer to updated references."
  [query :- ::lib.schema/query]
  (lib.walk/walk-stages query nest-expressions-in-stage))
