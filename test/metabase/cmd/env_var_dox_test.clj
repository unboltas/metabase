(ns metabase.cmd.env-var-dox-test
  (:require
   [clojure.string :as str]
   [clojure.test :refer :all]
   [metabase.cmd.env-var-dox :as sut]))

(def settings-filtered (filter #(#{:active-users-count ;; This should be excluded
                                   :aggregated-query-row-limit
                                   :admin-email}
                                 (:name %))
                               (sut/get-settings)))

(def admin-email-docs "### `MB_ADMIN_EMAIL`\n\n- Type: string\n- Default: `null`\n\n- [Configuration file name](./config-file.md): `admin-email`\n\nThe email address users should be referred to if they encounter a problem.")
(def aggregated-query-row-limit-docs "### `MB_AGGREGATED_QUERY_ROW_LIMIT`\n\n- Type: integer\n- Default: `10000`\n- [Exported as](../installation-and-operation/serialization.md): `aggregated-query-row-limit`.\n- [Configuration file name](./config-file.md): `aggregated-query-row-limit`\n\nMaximum number of rows to return for aggregated queries via the API.")

(def expected-docs (str/join "\n\n"
                             [admin-email-docs
                              aggregated-query-row-limit-docs]))

(deftest test-env-var-docs
  (testing "Environment docs are formatted as expected."
    (let [generated-docs (sut/format-env-var-docs settings-filtered)]
      (is (= expected-docs
             (str/join "\n\n" generated-docs))))))
