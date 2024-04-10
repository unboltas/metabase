(ns metabase.lib.drill-thru.combine-columns
  "Adds an expression clause that concatenates several string columns.

  Entry points:

  - Column header

  Query transformation:

  - Add an expression that `concat`s the clicked column with 1 or more `[separator column]` pairs."
  (:require
   [metabase.lib.drill-thru.common :as lib.drill-thru.common]
   [metabase.lib.schema :as lib.schema]
   [metabase.lib.schema.drill-thru :as lib.schema.drill-thru]
   [metabase.lib.types.isa :as lib.types.isa]
   [metabase.util.malli :as mu]))

(mu/defn combine-columns-drill :- [:maybe ::lib.schema.drill-thru/drill-thru.combine-columns]
  "Column clicks on string columns.

  Might add a stage, like `:drill-thru/column-filter` does, if the current stage has aggregations."
  [_query                 :- ::lib.schema/query
   _stage-number          :- :int
   {:keys [column value]} :- ::lib.schema.drill-thru/context]
  (when (and column
             (nil? value)
             (lib.types.isa/string? column))
    (merge {:lib/type :metabase.lib.drill-thru/drill-thru
            :type     :drill-thru/combine-columns
            :column   column})))

(defmethod lib.drill-thru.common/drill-thru-info-method :drill-thru/combine-columns
  [_query _stage-number {:keys [column]}]
  {:type   :drill-thru/combine-columns
   :column column})

(defmethod lib.drill-thru.common/drill-thru-method :drill-thru/combine-columns
  [_query _stage-number _drill & _args]
  (throw (ex-info "Do not call drill-thru for combine-columns; add the expression directly" {}))
  #_(let [expr           (apply lib.expression/concat column
                              (apply concat sep-col-pairs))
        display-name   (->> sep-col-pairs
                            (map second)
                            (cons column)
                            (map :name)
                            (str/join "_"))
        unique-name-fn (lib.util/unique-name-generator)]
    (doseq [col-name (->> (lib.util/query-stage query stage-number)
                          (lib.metadata.calculation/returned-columns query stage-number)
                          (map :name))]
      (unique-name-fn col-name))
    (lib.expression/expression query stage-number (unique-name-fn display-name) expr)))
