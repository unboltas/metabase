(ns metabase.driver.druid-jdbc-test
  (:require
   [clojure.test :refer :all]
   [metabase.driver :as driver]
   [metabase.sync :as sync]
   [metabase.test :as mt]
   [metabase.timeseries-query-processor-test.util :as tqpt]
   [metabase.util :as u]
   [toucan2.tools.with-temp :as t2.with-temp]))

;; TODO: There are sync differences between jdbc and non-jdbc implementation. Verify it's ok!
;; TODO: This should probably not be parallel.
(deftest ^:synchronized sync-test
  (mt/test-driver
   :druid-jdbc
   (tqpt/with-flattened-dbdef
     (testing "describe-database"
       (is (= {:tables #{{:schema "druid", :name "checkins" :description nil}}}
              (driver/describe-database :druid-jdbc (mt/db)))))
     (testing "describe-table"
       (is (=? {:schema "druid"
                :name   "checkins"
                :fields #{{:name "__time",
                           :database-type "TIMESTAMP",
                           :database-required false,
                           :database-is-auto-increment false,
                           :base-type :type/DateTime,
                           :database-position 0,
                           :json-unfolding false}
                          {:name "count",
                           :database-type "BIGINT",
                           :database-required false,
                           :database-is-auto-increment false,
                           :base-type :type/BigInteger,
                           :database-position 10,
                           :json-unfolding false}
                          {:name "id",
                           :database-type "BIGINT",
                           :database-required false,
                           :database-is-auto-increment false,
                           :base-type :type/BigInteger,
                           :database-position 1,
                           :json-unfolding false}
                          {:name "unique_users",
                           :database-type "COMPLEX<hyperUnique>",
                           :database-required false,
                           :database-is-auto-increment false,
                          ;; TODO: Adjust the base type for complex types!
                           :base-type :type/*,
                           :database-position 11,
                           :json-unfolding false}
                          {:name "user_last_login",
                           :database-type "VARCHAR",
                           :database-required false,
                           :database-is-auto-increment false,
                           :base-type :type/Text,
                           :database-position 2,
                           :json-unfolding false}
                          {:name "user_name",
                           :database-type "VARCHAR",
                           :database-required false,
                           :database-is-auto-increment false,
                           :base-type :type/Text,
                           :database-position 3,
                           :json-unfolding false}
                          {:name "user_password",
                           :database-type "VARCHAR",
                           :database-required false,
                           :database-is-auto-increment false,
                           :base-type :type/Text,
                           :database-position 4,
                           :json-unfolding false}
                          {:name "venue_category_name",
                           :database-type "VARCHAR",
                           :database-required false,
                           :database-is-auto-increment false,
                           :base-type :type/Text,
                           :database-position 5,
                           :json-unfolding false}
                          {:name "venue_latitude",
                           :database-type "DOUBLE",
                           :database-required false,
                           :database-is-auto-increment false,
                           :base-type :type/Float,
                           :database-position 6,
                           :json-unfolding false}
                          {:name "venue_longitude",
                           :database-type "DOUBLE",
                           :database-required false,
                           :database-is-auto-increment false,
                           :base-type :type/Float,
                           :database-position 7,
                           :json-unfolding false}
                          {:name "venue_name",
                           :database-type "VARCHAR",
                           :database-required false,
                           :database-is-auto-increment false,
                           :base-type :type/Text,
                           :database-position 8,
                           :json-unfolding false}
                          {:name "venue_price",
                           :database-type "BIGINT",
                           :database-required false,
                           :database-is-auto-increment false,
                           :base-type :type/BigInteger,
                           :database-position 9,
                           :json-unfolding false}}}
               (driver/describe-table :druid-jdbc (mt/db) {:schema "druid" :name "checkins"}))))
               ;; TODO: What's idiomatic way of expressing that we also want to print the exception on failure?
               (testing "Full sync does not throw an exception"
                 (is (=? [::success some?]
                         (try (let [result (sync/sync-database! (mt/db))]
                                #_(throw (ex-info "hello" {:wrong 1}))
                                [::success result])
                              (catch Throwable t
                                [::failure t]))))))))

;; TODO: Find a way how to get database version using jdbc driver.
(deftest dbms-version-test
  (mt/test-driver
   :druid-jdbc
   (is (= 1 1))))

;;
;; Ported from [[druid/test/metabase/query_processor_test.clj]]
;;

;; TODO: week start does not work yet correctly for Druid JDBC. Enable this test while resolving that.
#_(deftest start-of-week-test
  (mt/test-driver :druid-jdbc
    (testing (str "Count the number of events in the given week. ")
      (is (= [["2015-10-04" 9]]
             (druid-query-returning-rows
               {:filter      [:between !day.timestamp "2015-10-04" "2015-10-10"]
                :aggregation [[:count $id]]
                :breakout    [!week.timestamp]}))))))

(deftest sum-aggregation-test
  (tqpt/test-timeseries-drivers
    (testing "sum, *"
      (is (= [[1 110688]
              [2 616708]
              [3 179661]
              [4  86284]]
             (-> (mt/run-mbql-query
                  checkins
                  {:aggregation [[:sum [:* $id $venue_price]]]
                   :breakout    [$venue_price]})
                 mt/rows))))))

(deftest min-aggregation-test
  (tqpt/test-timeseries-drivers
    (testing "min, +"
      (is (= [[1  4]
              [2  3]
              [3  8]
              [4 12]]
             (-> (mt/run-mbql-query
                  checkins
                  {:aggregation [[:min [:+ $id $venue_price]]]
                   :breakout    [$venue_price]})
                 mt/rows))))))

(deftest max-aggregation-test
  (tqpt/test-timeseries-drivers
    (testing "max, /"
      (is (= [[1 1000.0]
              [2  499.5]
              [3  332.0]
              [4  248.25]]
             (-> (mt/run-mbql-query
                  checkins
                  {:aggregation [[:max [:/ $id $venue_price]]]
                   :breakout    [$venue_price]})
                 mt/rows))))))

(deftest avg-aggregation-test
  (tqpt/test-timeseries-drivers
    (testing "avg, -"
      (is (= [[1 500.85067873303166]
              [2 1002.7772357723577]
              [3 1562.2695652173913]
              [4 1760.8979591836735]]
             (-> (mt/run-mbql-query
                  checkins
                  {:aggregation [[:avg [:* $id $venue_price]]]
                   :breakout    [$venue_price]})
                 mt/rows))))))

(deftest share-aggregation-test
  (mt/test-driver :druid-jdbc
    (testing "share"
      (is (= [[0.951]]
             (-> (mt/run-mbql-query
                  checkins
                  {:aggregation [[:share [:< $venue_price 4]]]})
                 mt/rows))))))

(deftest count-where-aggregation-test
  (tqpt/test-timeseries-drivers
    (testing "count-where"
      (is (= [[951.0]]
             (-> (mt/run-mbql-query
                  checkins
                  {:aggregation [[:count-where [:< $venue_price 4]]]})
                 mt/rows))))))

(deftest sum-where-aggregation-test
  (tqpt/test-timeseries-drivers
    (testing "sum-where"
      (is (= [[1796.0]]
             (-> (mt/run-mbql-query
                  checkins
                  {:aggregation [[:sum-where $venue_price [:< $venue_price 4]]]})
                 mt/rows))))))

(deftest count-aggregation-test
  (tqpt/test-timeseries-drivers
    (testing "aggregation w/o field"
      (is (= [[1 222]
              [2 616]
              [3 116]
              [4  50]]
             (-> (mt/run-mbql-query
                  checkins
                  {:aggregation [[:+ 1 [:count]]]
                   :breakout    [$venue_price]})
                 mt/rows))))))

(deftest expression-aggregations-test
  (tqpt/test-timeseries-drivers
    (testing "post-aggregation math w/ 2 args: count + sum"
      (is (= [[1  442]
              [2 1845]
              [3  460]
              [4  245]]
             (-> (mt/run-mbql-query
                  checkins
                  {:aggregation [[:+ [:count $id] [:sum $venue_price]]]
                   :breakout    [$venue_price]})
                 mt/rows))))

    (testing "post-aggregation math w/ 3 args: count + sum + count"
      (is (= [[1  663]
              [2 2460]
              [3  575]
              [4  294]]
             (-> (mt/run-mbql-query
                  checkins
                  {:aggregation [[:+
                                  [:count $id]
                                  [:sum $venue_price]
                                  [:count $venue_price]]]
                   :breakout    [$venue_price]})
                 mt/rows))))

    (testing "post-aggregation math w/ a constant: count * 10"
      (is (= [[1 2210]
              [2 6150]
              [3 1150]
              [4  490]]
             (-> (mt/run-mbql-query
                  checkins
                  {:aggregation [[:* [:count $id] 10]]
                   :breakout    [$venue_price]})
                 mt/rows))))

    (testing "nested post-aggregation math: count + (count * sum)"
      (is (= [[1  49062]
              [2 757065]
              [3  39790]
              [4  9653]]
             (-> (mt/run-mbql-query
                  checkins
                  {:aggregation [[:+
                                  [:count $id]
                                  [:* [:count $id] [:sum $venue_price]]]]
                   :breakout    [$venue_price]})
                 mt/rows))))

    (testing "post-aggregation math w/ avg: count + avg"
      (is (= [[1  721.8506787330316]
              [2 1116.388617886179]
              [3  635.7565217391304]
              [4  489.2244897959184]]
             (-> (mt/run-mbql-query
                  checkins
                  {:aggregation [[:+ [:count $id] [:avg $id]]]
                   :breakout    [$venue_price]})
                 mt/rows))))

    (testing "aggregation with math inside the aggregation :scream_cat:"
      (is (= [[1  442]
              [2 1845]
              [3  460]
              [4  245]]
             (-> (mt/run-mbql-query
                  checkins
                  {:aggregation [[:sum [:+ $venue_price 1]]]
                   :breakout    [$venue_price]})
                 mt/rows))))

    (testing "post aggregation math + math inside aggregations: max(venue_price) + min(venue_price - id)"
      (is (= [[1 -998]
              [2 -995]
              [3 -990]
              [4 -985]]
             (-> (mt/run-mbql-query
                  checkins
                  {:aggregation [[:+
                                  [:max $venue_price]
                                  [:min [:- $venue_price $id]]]]
                   :breakout    [$venue_price]})
                 mt/rows))))))

(deftest named-top-level-aggregation-test
  (tqpt/test-timeseries-drivers
    (testing "check that we can name an expression aggregation w/ aggregation at top-level"
      (is (= [[1  442]
              [2 1845]
              [3  460]
              [4  245]]
             (mt/rows
               (mt/run-mbql-query
                checkins
                {:aggregation [[:aggregation-options [:sum [:+ $venue_price 1]] {:name "New Price"}]]
                 :breakout    [$venue_price]})))))))

(deftest named-expression-aggregations-test
  (tqpt/test-timeseries-drivers
    (testing "check that we can name an expression aggregation w/ expression at top-level"
      (is (= {:rows    [[1  180]
                        [2 1189]
                        [3  304]
                        [4  155]]
              :columns ["venue_price" "Sum-41"]}
             (mt/rows+column-names
               (mt/run-mbql-query checkins
                 {:aggregation [[:aggregation-options [:- [:sum $venue_price] 41] {:name "Sum-41"}]]
                  :breakout    [$venue_price]})))))))

;; TODO: There is a failure!
(deftest distinct-count-of-two-dimensions-test
  (tqpt/test-timeseries-drivers
    (is (= {:rows    [[98]]
            :columns ["count"]}
           (mt/rows+column-names
             @(def xix (mt/run-mbql-query checkins
                                          {:aggregation [[:distinct [:+ $checkins.venue_category_name $checkins.venue_name]]]})))))))

(deftest metrics-inside-aggregation-clauses-test
  (tqpt/test-timeseries-drivers
    (testing "check that we can handle METRICS inside expression aggregation clauses"
      (t2.with-temp/with-temp [:model/Metric metric {:definition (mt/$ids checkins
                                                                          {:aggregation [:sum $venue_price]
                                                                           :filter      [:> $venue_price 1]})
                                                     :table_id (mt/id :checkins)}]
        (is (= [[2 1231]
                [3  346]
                [4 197]]
               (-> (mt/run-mbql-query checkins
                                      {:aggregation [:+ [:metric (u/the-id metric)] 1]
                                       :breakout    [$venue_price]})
                   mt/rows)))))))

(deftest order-by-aggregation-test
  (tqpt/test-timeseries-drivers
    (doseq [[direction expected-rows] {:desc [["Bar" "Felipinho Asklepios"      8]
                                              ["Bar" "Spiros Teofil"            8]
                                              ["Japanese" "Felipinho Asklepios" 7]
                                              ["Japanese" "Frans Hevel"         7]
                                              ["Mexican" "Shad Ferdynand"       7]]
                                       :asc  [["American" "Rüstem Hebel"    1]
                                              ["Artisan"  "Broen Olujimi"   1]
                                              ["Artisan"  "Conchúr Tihomir" 1]
                                              ["Artisan"  "Dwight Gresham"  1]
                                              ["Artisan"  "Plato Yeshua"    1]]}]
      (testing direction
        (is (= expected-rows
               (-> (mt/run-mbql-query
                    checkins
                    {:aggregation [[:aggregation-options [:distinct $checkins.venue_name] {:name "__count_0"}]]
                     :breakout    [$venue_category_name $user_name]
                     :order-by    [[direction [:aggregation 0]] [:asc $checkins.venue_category_name]]
                     :limit       5})
                   mt/rows)))))))

(deftest hll-count-test
  (tqpt/test-timeseries-drivers
    (testing "Do we generate the correct count clause for HLL fields?"
      (is (= [["Bar"      "Szymon Theutrich"    13]
              ["Mexican"  "Dwight Gresham"      12]
              ["American" "Spiros Teofil"       10]
              ["Bar"      "Felipinho Asklepios" 10]
              ["Bar"      "Kaneonuskatew Eiran" 10]]
             (-> (mt/run-mbql-query
                  checkins
                  {:aggregation [[:aggregation-options [:count $checkins.user_name] {:name "unique_users"}]]
                   :breakout   [$venue_category_name $user_name]
                   :order-by   [[:desc [:aggregation 0]] [:asc $checkins.venue_category_name]]
                   :limit      5})
                 mt/rows))))))

(deftest multiple-filters-test
  (mt/test-driver :druid-jdbc
    (testing "Should be able to filter by both a temporal and a non-temporal filter (#15903)"
      (tqpt/with-flattened-dbdef
        (is (= [4]
               (mt/first-row
                (mt/run-mbql-query checkins
                  {:aggregation [[:count]]
                   :filter      [:and
                                 [:= $venue_category_name "Mexican"]
                                 [:= !month.__time "2015-09"]]}))))))))

(deftest open-ended-temporal-filter-test
  (mt/test-driver :druid-jdbc
    (testing "Should be able to filter by an open-ended absolute temporal moment (#15902)"
      (tqpt/with-flattened-dbdef
        (is (= [58]
               (mt/first-row
                (mt/run-mbql-query checkins
                  {:aggregation [[:count]]
                   :filter      [:> $__time "2015-10-01T00:00:00Z"]}))))))))