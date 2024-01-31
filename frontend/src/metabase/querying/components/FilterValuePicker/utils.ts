import type { SelectItem } from "metabase/ui";
import type { FieldValuesSearchInfo } from "metabase-lib";
import * as Lib from "metabase-lib";
import type { FieldValue, FieldValuesResult } from "metabase-types/api";

export function canLoadFieldValues({
  fieldId,
  hasFieldValues,
}: FieldValuesSearchInfo): boolean {
  return fieldId != null && hasFieldValues === "list";
}

export function canListFieldValues({
  values,
  has_more_values,
}: FieldValuesResult): boolean {
  return values.length > 0 && !has_more_values;
}

export function canSearchFieldValues(
  { fieldId, searchFieldId, hasFieldValues }: FieldValuesSearchInfo,
  fieldData: FieldValuesResult | undefined,
): boolean {
  return (
    fieldId != null &&
    searchFieldId != null &&
    ((hasFieldValues === "list" && fieldData?.has_more_values) ||
      hasFieldValues === "search")
  );
}

function getFieldOptions(fieldValues: FieldValue[]): SelectItem[] {
  return fieldValues
    .filter(([value]) => value != null)
    .map(([value, label = value]) => ({
      value: String(value),
      label: String(label),
    }));
}

function getSelectedOptions(selectedValues: string[]): SelectItem[] {
  return selectedValues.map(value => ({
    value,
    label: value,
  }));
}

export function getEffectiveOptions(
  fieldValues: FieldValue[],
  selectedValues: string[],
): SelectItem[] {
  const options = [
    ...getFieldOptions(fieldValues),
    ...getSelectedOptions(selectedValues),
  ];

  const mapping = options.reduce((map: Record<string, string>, option) => {
    map[option.value] ??= option.label ?? option.value;
    return map;
  }, {});

  return Object.entries(mapping).map(([value, label]) => ({ value, label }));
}

export function isKeyColumn(column: Lib.ColumnMetadata) {
  return Lib.isPrimaryKey(column) || Lib.isForeignKey(column);
}