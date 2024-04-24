import * as MetabaseAnalytics from "metabase/lib/analytics";
import { ClickActionsView } from "metabase/visualizations/components/ClickActions";
import type {
  ClickActionPopoverProps,
  Drill,
  RegularClickAction,
} from "metabase/visualizations/types/click-actions";
import type * as Lib from "metabase-lib";

export const columnExtractDrill: Drill<Lib.ColumnExtractDrillThruInfo> = ({
  drill,
  drillInfo,
  clicked,
  applyDrill,
}) => {
  const DrillPopover = ({ onClick }: ClickActionPopoverProps) => {
    const actions: RegularClickAction[] = drillInfo.extractions.map(
      extraction => ({
        name: `extract.${extraction.displayName}`,
        title: extraction.displayName,
        section: "extract-popover",
        buttonType: "horizontal",
        question: () => applyDrill(drill, extraction.key),
        extra: () => ({ settingsSyncOptions: { column: clicked.column } }),
      }),
    );

    function handleClick(action: RegularClickAction) {
      MetabaseAnalytics.trackStructEvent(
        "Actions",
        "column_extract_via_column_header",
      );
      onClick(action);
    }

    return <ClickActionsView clickActions={actions} onClick={handleClick} />;
  };

  return [
    {
      name: "extract",
      title: drillInfo.displayName,
      section: "extract",
      icon: "extract",
      buttonType: "horizontal",
      popover: DrillPopover,
    },
  ];
};
