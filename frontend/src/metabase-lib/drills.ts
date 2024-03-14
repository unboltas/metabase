import * as ML from "cljs/metabase.lib.js";
import type { DatasetColumn, RowValue } from "metabase-types/api";

import { expressionClause } from "./expression";
import type {
  ClickObjectDataRow,
  ClickObjectDimension,
  ColumnMetadata,
  DrillThru,
  ExpressionClause,
  FilterDrillDetails,
  PivotType,
  Query,
} from "./types";

// NOTE: value might be null or undefined, and they mean different things!
// null means a value of SQL NULL; undefined means no value, i.e. a column header was clicked.
export function availableDrillThrus(
  query: Query,
  stageIndex: number,
  column: DatasetColumn | undefined,
  value: RowValue | undefined,
  row: ClickObjectDataRow[] | undefined,
  dimensions: ClickObjectDimension[] | undefined,
): DrillThru[] {
  return ML.available_drill_thrus(
    query,
    stageIndex,
    column,
    value,
    row,
    dimensions,
  );
}

// TODO: Precise types for each of the various extra args?
export function drillThru(
  query: Query,
  stageIndex: number,
  drillThru: DrillThru,
  ...args: unknown[]
): Query {
  return ML.drill_thru(query, stageIndex, drillThru, ...args);
}

export function filterDrillDetails(drillThru: DrillThru): FilterDrillDetails {
  return ML.filter_drill_details(drillThru);
}

export function pivotTypes(drillThru: DrillThru): PivotType[] {
  return ML.pivot_types(drillThru);
}

export function pivotColumnsForType(
  drillThru: DrillThru,
  pivotType: PivotType,
): ColumnMetadata[] {
  return ML.pivot_columns_for_type(drillThru, pivotType);
}

export function combineColumnsDrillExpression(
  _query: Query,
  _stageIndex: number,
  _drillThru: DrillThru,
  _columnsAndSeparators: { column: ColumnMetadata; separator: string }[],
): ExpressionClause {
  // TODO: remove this mock
  return expressionClause("+", [1, 2]);
}
