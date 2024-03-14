import type { FormEventHandler } from "react";
import { useMemo, useState } from "react";
import { jt, t } from "ttag";

import { Box, Button, Card, Flex, Icon, Stack, Title } from "metabase/ui";
import * as Lib from "metabase-lib";

import type { ColumnAndSeparator } from "../../types";
import {
  formatSeparator,
  getColumnOptions,
  getInitialColumnAndSeparator,
  getNextColumnAndSeparator,
} from "../../utils";
import { ColumnAndSeparatorRow } from "../ColumnAndSeparatorRow";

import styles from "./CombineColumnsDrill.module.css";

interface Props {
  drillInfo: Lib.CombineColumnsDrillThruInfo;
  query: Lib.Query;
  stageIndex: number;
  onSubmit: (columnsAndSeparators: ColumnAndSeparator[]) => void;
}

export const CombineColumnsDrill = ({
  drillInfo,
  query,
  stageIndex,
  onSubmit,
}: Props) => {
  const { availableColumns, column, defaultSeparator } = drillInfo;
  const columnInfo = Lib.displayInfo(query, stageIndex, column);
  const options = useMemo(() => {
    return getColumnOptions(query, stageIndex, availableColumns);
  }, [query, stageIndex, availableColumns]);

  const [columnsAndSeparators, setColumnsAndSeparators] = useState([
    getInitialColumnAndSeparator(drillInfo),
  ]);
  const [isUsingDefaultSeparator, setIsUsingDefaultSeparator] = useState(true);

  const handleChange = (index: number, change: Partial<ColumnAndSeparator>) => {
    setColumnsAndSeparators(value => [
      ...value.slice(0, index),
      { ...value[index], ...change },
      ...value.slice(index + 1),
    ]);
  };

  const handleAdd = () => {
    setColumnsAndSeparators(value => [
      ...value,
      getNextColumnAndSeparator(drillInfo, options, columnsAndSeparators),
    ]);
  };

  const handleRemove = (index: number) => {
    setColumnsAndSeparators(value => [
      ...value.slice(0, index),
      ...value.slice(index + 1),
    ]);
  };

  const handleEditSeparators = () => {
    setIsUsingDefaultSeparator(false);
  };

  const handleSubmit: FormEventHandler = event => {
    event.preventDefault();
    onSubmit(columnsAndSeparators);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className={styles.card} maw="100vw" miw={340} p="lg">
        <Title
          mb="md"
          order={4}
        >{jt`Combine ${columnInfo.displayName} with`}</Title>

        <Stack spacing="lg">
          <Stack spacing="sm">
            <Stack className={styles.inputs} mah="50vh" spacing="sm">
              {columnsAndSeparators.map(({ column, separator }, index) => (
                <ColumnAndSeparatorRow
                  column={column}
                  index={index}
                  key={index}
                  options={options}
                  separator={separator}
                  showLabels={index === 0 && !isUsingDefaultSeparator}
                  showRemove={columnsAndSeparators.length > 1}
                  showSeparator={!isUsingDefaultSeparator}
                  onChange={handleChange}
                  onRemove={handleRemove}
                />
              ))}
            </Stack>

            {isUsingDefaultSeparator && (
              <Box>
                <Button p={0} variant="subtle" onClick={handleEditSeparators}>
                  {jt`Separated by ${formatSeparator(defaultSeparator)}`}
                </Button>
              </Box>
            )}
          </Stack>

          <Flex align="center" gap="md" justify="space-between">
            <Button
              leftIcon={<Icon name="add" />}
              p={0}
              variant="subtle"
              onClick={handleAdd}
            >
              {t`Add another column`}
            </Button>

            <Button type="submit" variant="filled">
              {t`Done`}
            </Button>
          </Flex>
        </Stack>
      </Card>
    </form>
  );
};
