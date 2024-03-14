import { t } from "ttag";

import { Button, Flex, Icon, Select, TextInput } from "metabase/ui";
import type * as Lib from "metabase-lib";

import type { ColumnAndSeparator, ColumnOption } from "../../types";
import { fromSelectValue, toSelectValue } from "../../utils";

import styles from "./ColumnAndSeparatorRow.module.css";

interface Props {
  column: Lib.ColumnMetadata;
  index: number;
  options: ColumnOption[];
  separator: string;
  showLabels: boolean;
  showRemove: boolean;
  showSeparator: boolean;
  onChange: (index: number, change: Partial<ColumnAndSeparator>) => void;
  onRemove: (index: number) => void;
}

export const ColumnAndSeparatorRow = ({
  column,
  index,
  options,
  separator,
  showLabels,
  showRemove,
  showSeparator,
  onChange,
  onRemove,
}: Props) => {
  return (
    <Flex align="flex-end" gap={12}>
      {showSeparator && (
        <TextInput
          className={styles.separator}
          label={showLabels ? t`Separator` : undefined}
          value={separator}
          w={110}
          onChange={event => {
            const separator = event.target.value;
            onChange(index, { separator });
          }}
        />
      )}

      <Select
        className={styles.column}
        data={options}
        label={showLabels ? t`Column` : undefined}
        styles={{
          wrapper: {
            "&:not(:only-child)": {
              marginTop: 0,
            },
          },
        }}
        value={toSelectValue(options, column)}
        onChange={value => {
          const column = fromSelectValue(options, value);
          onChange(index, { column });
        }}
      />

      {showRemove && (
        <Button
          aria-label={t`Remove column`}
          leftIcon={<Icon name="close" />}
          styles={{
            root: {
              borderColor: "transparent",
            },
          }}
          variant="default"
          onClick={() => {
            onRemove(index);
          }}
        />
      )}
    </Flex>
  );
};
