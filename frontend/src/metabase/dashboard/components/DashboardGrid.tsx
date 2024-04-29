import cx from "classnames";
import type { LocationDescriptor } from "history";
import type { CSSProperties } from "react";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { push } from "react-router-redux";
import { usePrevious } from "react-use";
import { t } from "ttag";
import _ from "underscore";

import type { QuestionPickerValueItem } from "metabase/common/components/QuestionPicker";
import { QuestionPickerModal } from "metabase/common/components/QuestionPicker";
import ExplicitSize from "metabase/components/ExplicitSize";
import Modal from "metabase/components/Modal";
import { ContentViewportContext } from "metabase/core/context/ContentViewportContext";
import ModalS from "metabase/css/components/modal.module.css";
import DashboardS from "metabase/css/dashboard.module.css";
import { AddSeriesModal } from "metabase/dashboard/components/AddSeriesModal/AddSeriesModal";
import { DashCard } from "metabase/dashboard/components/DashCard/DashCard";
import {
  DashboardCardContainer,
  DashboardGridContainer,
} from "metabase/dashboard/components/DashboardGrid.styled";
import { GridLayout } from "metabase/dashboard/components/grid/GridLayout";
import { generateMobileLayout } from "metabase/dashboard/components/grid/utils";
import {
  getCardData,
  getClickBehaviorSidebarDashcard,
  getDashboardComplete,
  getIsEditing,
  getParameterValues,
  getSelectedTabId,
  getSlowCards,
} from "metabase/dashboard/selectors";
import {
  getVisibleCardIds,
  isQuestionDashCard,
} from "metabase/dashboard/utils";
import * as MetabaseAnalytics from "metabase/lib/analytics";
import { color } from "metabase/lib/colors";
import {
  DEFAULT_CARD_SIZE,
  GRID_ASPECT_RATIO,
  GRID_BREAKPOINTS,
  GRID_COLUMNS,
  GRID_WIDTH,
  MIN_ROW_HEIGHT,
} from "metabase/lib/dashboard_grid";
import { useDispatch, useSelector } from "metabase/lib/redux";
import { checkNotNull } from "metabase/lib/types";
import { PLUGIN_COLLECTIONS } from "metabase/plugins";
import EmbedFrameS from "metabase/public/components/EmbedFrame/EmbedFrame.module.css";
import { addUndo } from "metabase/redux/undo";
import { getMetadata } from "metabase/selectors/metadata";
import { getVisualizationRaw } from "metabase/visualizations";
import type { Mode } from "metabase/visualizations/click-actions/Mode";
import LegendS from "metabase/visualizations/components/Legend.module.css";
import {
  MOBILE_DEFAULT_CARD_HEIGHT,
  MOBILE_HEIGHT_BY_DISPLAY_TYPE,
} from "metabase/visualizations/shared/utils/sizes";
import type {
  BaseDashboardCard,
  Dashboard,
  DashboardCard,
  DashCardId,
  Card,
  DashboardTabId,
} from "metabase-types/api";

import {
  markNewCardSeen,
  navigateToNewCardFromDashboard,
  onReplaceAllDashCardVisualizationSettings,
  onUpdateDashCardVisualizationSettings,
  removeCardFromDashboard,
  replaceCard,
  setDashCardAttributes,
  setMultipleDashCardAttributes,
  showClickBehaviorSidebar,
  undoRemoveCardFromDashboard,
  fetchCardData,
} from "../actions";

type GridBreakpoint = "desktop" | "mobile";

type LayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
  dashcard: BaseDashboardCard;
};

type DashboardChangeItem = {
  id: DashCardId;
  attributes: Partial<BaseDashboardCard>;
};

type DashboardGridProps = {
  width?: number | null;
  isEditingParameter?: boolean;
  isFullscreen?: boolean;
  isNightMode?: boolean;
  isPublic?: boolean;
  isXray?: boolean;
  mode?: Mode;
  className?: string;
  style?: CSSProperties;
  disableNewCardNavigation?: boolean;
};

const DashboardGrid = ({
  width = null,
  isEditingParameter = false,
  isFullscreen = false,
  isNightMode = false,
  isPublic = false,
  isXray = false,
  mode,
  disableNewCardNavigation = false,
}: DashboardGridProps) => {
  const context = useContext(ContentViewportContext);

  const dispatch = useDispatch();

  const onChangeLocation = (location: LocationDescriptor) =>
    dispatch(push(location));

  const dashboardComplete: Dashboard | null = useSelector(getDashboardComplete);
  const dashboard = checkNotNull(dashboardComplete);

  const dashcardData = useSelector(getCardData);
  const selectedTabId = useSelector(getSelectedTabId);
  const isEditing = useSelector(getIsEditing);
  const parameterValues = useSelector(getParameterValues);
  const slowCards = useSelector(getSlowCards);
  const metadata = useSelector(getMetadata);
  const clickBehaviorSidebarDashcard = useSelector(
    getClickBehaviorSidebarDashcard,
  );

  const [visibleCardIds, setVisibleCardIds] = useState<Set<DashCardId>>(
    getVisibleCardIds(dashboard.dashcards, dashcardData),
  );
  const [initialCardSizes, setInitialCardSizes] = useState<
    Record<DashCardId, LayoutItem>
  >({});

  const [layouts, setLayouts] = useState({});
  const [addSeriesModalDashCard, setAddSeriesModalDashCard] =
    useState<DashboardCard | null>(null);
  const [replaceCardModalDashCard, setReplaceCardModalDashCard] =
    useState<DashboardCard | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimationPaused, setIsAnimationPaused] = useState(true);

  const prevProps = usePrevious({
    dashboard,
    dashcardData,
    isEditing,
    selectedTabId,
  });

  const getVisibleCards = useCallback(
    (
      cards: DashboardCard[] = dashboard.dashcards,
      _visibleCardIds: Set<DashCardId> = visibleCardIds,
      _isEditing: boolean = isEditing,
      _selectedTabId: DashboardTabId = selectedTabId,
    ) => {
      const tabCards = cards.filter(
        card =>
          !selectedTabId ||
          card.dashboard_tab_id === selectedTabId ||
          card.dashboard_tab_id === null,
      );

      if (!tabCards) {
        return [];
      }

      if (!isEditing && visibleCardIds) {
        return tabCards.filter(card => visibleCardIds.has(card.id));
      }
      return tabCards ?? [];
    },
    [dashboard.dashcards, isEditing, selectedTabId, visibleCardIds],
  );

  const onLayoutChange = ({
    layout,
    breakpoint,
  }: {
    layout: LayoutItem[];
    breakpoint: GridBreakpoint;
  }) => {
    // We allow moving and resizing cards only on the desktop
    // Ensures onLayoutChange triggered by window resize,
    // won't break the main layout
    if (!isEditing || breakpoint !== "desktop") {
      return;
    }

    const changes: DashboardChangeItem[] = [];

    layout.forEach(layoutItem => {
      const dashboardCard = getVisibleCards().find(
        card => String(card.id) === layoutItem.i,
      );
      if (dashboardCard) {
        const keys = ["h", "w", "x", "y"];
        const changed = !_.isEqual(
          _.pick(layoutItem, keys),
          _.pick(getLayoutForDashCard(dashboardCard), keys),
        );

        if (changed) {
          changes.push({
            id: dashboardCard.id,
            attributes: {
              col: layoutItem.x,
              row: layoutItem.y,
              size_x: layoutItem.w,
              size_y: layoutItem.h,
            },
          });
        }
      }
    });

    if (changes.length > 0) {
      dispatch(setMultipleDashCardAttributes({ dashcards: changes }));
      MetabaseAnalytics.trackStructEvent("Dashboard", "Layout Changed");
    }
  };

  const getLayoutForDashCard = useCallback(
    (dashcard: BaseDashboardCard) => {
      const visualization = getVisualizationRaw([{ card: dashcard.card }]);
      const initialSize = DEFAULT_CARD_SIZE;
      const minSize = visualization?.minSize || DEFAULT_CARD_SIZE;

      let minW, minH;
      if (initialCardSizes) {
        minW = Math.min(initialCardSizes[dashcard.id]?.w, minSize.width);
        minH = Math.min(initialCardSizes[dashcard.id]?.h, minSize.height);
      } else {
        minW = minSize.width;
        minH = minSize.height;
      }
      return {
        i: String(dashcard.id),
        x: dashcard.col || 0,
        y: dashcard.row || 0,
        w: dashcard.size_x || initialSize.width,
        h: dashcard.size_y || initialSize.height,
        dashcard: dashcard,
        minW,
        minH,
      };
    },
    [initialCardSizes],
  );

  const getInitialCardSizes = useCallback(
    (cards: BaseDashboardCard[]) => {
      return cards
        .map(card => getLayoutForDashCard(card))
        .reduce((acc, dashcardLayout) => {
          const dashcardId = dashcardLayout.i;
          return {
            ...acc,
            [dashcardId]: _.pick(dashcardLayout, ["w", "h"]),
          };
        }, {});
    },
    [getLayoutForDashCard],
  );

  const getLayouts = useCallback(
    (cards: BaseDashboardCard[]) => {
      const desktop = cards.map(getLayoutForDashCard);
      const mobile = generateMobileLayout({
        desktopLayout: desktop,
        defaultCardHeight: MOBILE_DEFAULT_CARD_HEIGHT,
        heightByDisplayType: MOBILE_HEIGHT_BY_DISPLAY_TYPE,
      });
      return { desktop, mobile };
    },
    [getLayoutForDashCard],
  );

  const getRowHeight = () => {
    const hasScroll = context
      ? context.clientHeight < context.scrollHeight
      : false;

    const aspectHeight = (width ?? 0) / GRID_WIDTH / GRID_ASPECT_RATIO;
    const actualHeight = Math.max(aspectHeight, MIN_ROW_HEIGHT);

    // prevent infinite re-rendering when the scroll bar appears/disappears
    // https://github.com/metabase/metabase/issues/17229
    return hasScroll ? Math.ceil(actualHeight) : Math.floor(actualHeight);
  };

  const renderAddSeriesModal = () => {
    // can't use PopoverWithTrigger due to strange interaction with ReactGridLayout
    const isOpen =
      !!addSeriesModalDashCard && isQuestionDashCard(addSeriesModalDashCard);
    return (
      <Modal
        className={cx(
          ModalS.Modal,
          DashboardS.Modal,
          DashboardS.AddSeriesModal,
        )}
        data-testid="add-series-modal"
        isOpen={isOpen}
      >
        {isOpen && (
          <AddSeriesModal
            dashcard={addSeriesModalDashCard}
            dashcardData={dashcardData}
            fetchCardData={(card, dashcard, options) =>
              dispatch(fetchCardData(card, dashcard, options))
            }
            setDashCardAttributes={attr =>
              dispatch(setDashCardAttributes(attr))
            }
            onClose={() => setAddSeriesModalDashCard(null)}
          />
        )}
      </Modal>
    );
  };

  const renderReplaceCardModal = () => {
    const hasValidDashCard =
      !!replaceCardModalDashCard &&
      isQuestionDashCard(replaceCardModalDashCard);

    const handleSelect = (nextCard: QuestionPickerValueItem) => {
      if (!hasValidDashCard) {
        return;
      }

      dispatch(
        replaceCard({
          dashcardId: replaceCardModalDashCard.id,
          nextCardId: nextCard.id,
        }),
      );

      dispatch(
        addUndo({
          message: getUndoReplaceCardMessage(replaceCardModalDashCard.card),
          undo: true,
          action: () =>
            dispatch(
              setDashCardAttributes({
                id: replaceCardModalDashCard.id,
                attributes: replaceCardModalDashCard,
              }),
            ),
        }),
      );
      handleClose();
    };

    const handleClose = () => {
      setReplaceCardModalDashCard(null);
    };

    if (!hasValidDashCard) {
      return null;
    }

    return (
      <QuestionPickerModal
        onChange={handleSelect}
        value={
          replaceCardModalDashCard.card.id
            ? {
                id: replaceCardModalDashCard.card.id,
                model:
                  replaceCardModalDashCard.card.type === "model"
                    ? "dataset"
                    : "card",
              }
            : undefined
        }
        onClose={handleClose}
      />
    );
  };

  // we need to track whether or not we're dragging so we can disable pointer events on action buttons :-/
  const onDrag = () => {
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const onDragStop = () => {
    setIsDragging(false);
  };

  const onDashCardRemove = (dc: DashboardCard) => {
    dispatch(
      removeCardFromDashboard({
        dashcardId: dc.id,
        cardId: dc.card_id,
      }),
    );
    dispatch(
      addUndo({
        message: t`Removed card`,
        undo: true,
        action: () =>
          dispatch(undoRemoveCardFromDashboard({ dashcardId: dc.id })),
      }),
    );
    MetabaseAnalytics.trackStructEvent("Dashboard", "Remove Card");
  };

  const onDashCardAddSeries = (dc: DashboardCard) => {
    setAddSeriesModalDashCard(dc);
  };

  const onReplaceCard = (dashcard: DashboardCard) => {
    setReplaceCardModalDashCard(dashcard);
  };

  const getDashboardCardIcon = (dashCard: BaseDashboardCard) => {
    const { isRegularCollection } = PLUGIN_COLLECTIONS;
    const isRegularQuestion = isRegularCollection({
      authority_level: dashCard.collection_authority_level,
    });
    const isRegularDashboard = isRegularCollection({
      authority_level: dashboard.collection_authority_level,
    });
    const authorityLevel = dashCard.collection_authority_level;
    if (isRegularDashboard && !isRegularQuestion && authorityLevel) {
      const opts = PLUGIN_COLLECTIONS.AUTHORITY_LEVEL[authorityLevel];
      const iconSize = 14;
      return {
        name: opts.icon,
        color: opts.color ? color(opts.color) : undefined,
        tooltip: opts.tooltips?.belonging,
        size: iconSize,

        // Workaround: headerIcon on cards in a first column have incorrect offset out of the box
        targetOffsetX: dashCard.col === 0 ? iconSize : 0,
      };
    }
  };

  useEffect(() => {
    if (prevProps) {
      const newVisibleCardIds = !isEditing
        ? getVisibleCardIds(
            prevProps.dashboard.dashcards,
            prevProps.dashcardData,
            visibleCardIds,
          )
        : new Set(prevProps.dashboard.dashcards.map(card => card.id));

      const cards = getVisibleCards(
        prevProps.dashboard.dashcards,
        newVisibleCardIds,
        prevProps.isEditing,
        prevProps.selectedTabId,
      );

      if (!_.isEqual(getVisibleCards(), cards)) {
        setInitialCardSizes(getInitialCardSizes(cards));
        setVisibleCardIds(newVisibleCardIds);
      }

      if (!_.isEqual(layouts, getLayouts(cards))) {
        setLayouts(getLayouts(cards));
      }
    }
  }, [
    getInitialCardSizes,
    getLayouts,
    getVisibleCards,
    isEditing,
    layouts,
    prevProps,
    visibleCardIds,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimationPaused(false);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const renderDashCard = (
    dc: DashboardCard,
    {
      isMobile,
      gridItemWidth,
      totalNumGridCols,
    }: {
      isMobile: boolean;
      gridItemWidth: number;
      totalNumGridCols: number;
    },
  ) => {
    return (
      <DashCard
        dashcard={dc}
        headerIcon={getDashboardCardIcon(dc)}
        dashcardData={dashcardData}
        parameterValues={parameterValues}
        slowCards={slowCards}
        gridItemWidth={gridItemWidth}
        totalNumGridCols={totalNumGridCols}
        markNewCardSeen={id => dispatch(markNewCardSeen(id))}
        isEditing={isEditing}
        isEditingParameter={isEditingParameter}
        isFullscreen={isFullscreen}
        isNightMode={isNightMode}
        isMobile={isMobile}
        isPublic={isPublic}
        isXray={isXray}
        onRemove={() => onDashCardRemove(dc)}
        onAddSeries={() => onDashCardAddSeries(dc)}
        onReplaceCard={() => onReplaceCard(dc)}
        onUpdateVisualizationSettings={settings =>
          dispatch(onUpdateDashCardVisualizationSettings(dc.id, settings))
        }
        onReplaceAllVisualizationSettings={settings =>
          dispatch(onReplaceAllDashCardVisualizationSettings(dc.id, settings))
        }
        mode={mode}
        navigateToNewCardFromDashboard={
          !disableNewCardNavigation
            ? opts => dispatch(navigateToNewCardFromDashboard(opts))
            : undefined
        }
        onChangeLocation={onChangeLocation}
        metadata={metadata}
        dashboard={dashboard}
        showClickBehaviorSidebar={id => dispatch(showClickBehaviorSidebar(id))}
        clickBehaviorSidebarDashcard={clickBehaviorSidebarDashcard}
      />
    );
  };

  const isEditingLayout = useMemo(
    () =>
      isEditing && !isEditingParameter && clickBehaviorSidebarDashcard == null,
    [clickBehaviorSidebarDashcard, isEditing, isEditingParameter],
  );

  const renderGridItem = ({
    item: dc,
    breakpoint,
    gridItemWidth,
    totalNumGridCols,
  }: {
    item: DashboardCard;
    breakpoint: GridBreakpoint;
    gridItemWidth: number;
    totalNumGridCols: number;
  }) => {
    const shouldChangeResizeHandle = isEditingTextOrHeadingCard(
      dc.card.display,
      isEditing,
    );

    return (
      <DashboardCardContainer
        key={String(dc.id)}
        data-testid="dashcard-container"
        className={cx(
          DashboardS.DashCard,
          EmbedFrameS.DashCard,
          LegendS.DashCard,
          {
            [DashboardS.BrandColorResizeHandle]: shouldChangeResizeHandle,
          },
        )}
        isAnimationDisabled={isAnimationPaused}
      >
        {renderDashCard(dc, {
          isMobile: breakpoint === "mobile",
          gridItemWidth,
          totalNumGridCols,
        })}
      </DashboardCardContainer>
    );
  };

  const renderGrid = () => {
    const rowHeight = getRowHeight();
    return (
      <GridLayout
        className={cx({
          [DashboardS.DashEditing]: isEditingLayout,
          [DashboardS.DashDragging]: isDragging,
        })}
        layouts={layouts}
        breakpoints={GRID_BREAKPOINTS}
        cols={GRID_COLUMNS}
        width={width}
        margin={{ desktop: [6, 6], mobile: [6, 10] }}
        containerPadding={[0, 0]}
        rowHeight={rowHeight}
        onLayoutChange={onLayoutChange}
        onDrag={onDrag}
        onDragStop={onDragStop}
        isEditing={isEditingLayout}
        compactType="vertical"
        items={getVisibleCards()}
        itemRenderer={renderGridItem}
      />
    );
  };

  return (
    <DashboardGridContainer
      data-testid="dashboard-grid"
      isFixedWidth={dashboard.width === "fixed"}
    >
      {width && width > 0 ? renderGrid() : <div />}
      {renderAddSeriesModal()}
      {renderReplaceCardModal()}
    </DashboardGridContainer>
  );
};

function isEditingTextOrHeadingCard(display: string, isEditing: boolean) {
  const isTextOrHeadingCard = display === "heading" || display === "text";

  return isEditing && isTextOrHeadingCard;
}

function getUndoReplaceCardMessage({ type }: Card) {
  if (type === "model") {
    return t`Model replaced`;
  }

  if (type === "question") {
    return t`Question replaced`;
  }

  throw new Error(`Unknown card.type: ${type}`);
}

export const DashboardGridConnected =
  ExplicitSize<DashboardGridProps>()(DashboardGrid);
