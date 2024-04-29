import cx from "classnames";
import type { Location } from "history";
import { useRef } from "react";
import { useMount, useUnmount, useUpdateEffect } from "react-use";
import _ from "underscore";

import LoadingAndErrorWrapper from "metabase/components/LoadingAndErrorWrapper";
import ColorS from "metabase/css/core/colors.module.css";
import CS from "metabase/css/core/index.css";
import DashboardS from "metabase/css/dashboard.module.css";
import {
  initialize as initializeDashboard,
  fetchDashboard as _fetchDashboard,
  fetchDashboardCardData as _fetchDashboardCardData,
  cancelFetchDashboardCardData as _cancelFetchDashboardCardData,
  fetchDashboardCardMetadata as _fetchDashboardCardMetadata,
  setParameterValue as _setParameterValue,
  setParameterValueToDefault as _setParameterValueToDefault,
} from "metabase/dashboard/actions";
import { getDashboardActions } from "metabase/dashboard/components/DashboardActions";
import { DashboardGridConnected } from "metabase/dashboard/components/DashboardGrid";
import { DashboardTabs } from "metabase/dashboard/components/DashboardTabs";
import {
  getDashboardComplete,
  getDraftParameterValues,
  getParameters,
  getParameterValues,
  getSelectedTabId,
} from "metabase/dashboard/selectors";
import type {
  FetchDashboardResult,
  SuccessfulFetchDashboardResult,
} from "metabase/dashboard/types";
import { isWithinIframe } from "metabase/lib/dom";
import { useDispatch, useSelector } from "metabase/lib/redux";
import ParametersS from "metabase/parameters/components/ParameterValueWidget.module.css";
import EmbedFrame from "metabase/public/components/EmbedFrame/EmbedFrame";
import { DashboardContainer } from "metabase/public/containers/PublicDashboard/PublicDashboard.styled";
import { setErrorPage as setErrorPageAction } from "metabase/redux/app";
import {
  setEmbedDashboardEndpoints,
  setPublicDashboardEndpoints,
} from "metabase/services";
import type { Mode } from "metabase/visualizations/click-actions/Mode";
import { PublicMode } from "metabase/visualizations/click-actions/modes/PublicMode";
import type { Dashboard, DashboardId, ParameterId } from "metabase-types/api";

type PublicDashboardProps = {
  location: Location;
  params: {
    uuid?: string;
    token?: string;
    dashboardId?: DashboardId;
  };
  isFullscreen?: boolean;
  isNightMode?: boolean;
};

export const PublicDashboard = (props: PublicDashboardProps) => {
  const dispatch = useDispatch();

  const fetchDashboardCardData = (
    options: {
      reload?: boolean;
      clearCache?: boolean;
    } = {},
  ) => dispatch(_fetchDashboardCardData(options));
  const setErrorPage = (error: any) => dispatch(setErrorPageAction(error));

  const dashboardId = (props.params.uuid || props.params.token) as string;
  const dashboard: Dashboard | null = useSelector(getDashboardComplete);
  const parameters = useSelector(getParameters);
  const parameterValues = useSelector(getParameterValues);
  const draftParameterValues = useSelector(getDraftParameterValues);
  const selectedTabId = useSelector(getSelectedTabId);

  const prevProps = useRef({ dashboardId, selectedTabId, parameterValues });

  const initializePublicDashboard = async () => {
    if (props.params.uuid) {
      setPublicDashboardEndpoints();
    } else if (props.params.token) {
      setEmbedDashboardEndpoints();
    }

    dispatch(initializeDashboard());

    const result: FetchDashboardResult = await dispatch(
      _fetchDashboard({
        dashId: dashboardId,
        queryParams: props.location.query,
      }),
    ).unwrap();

    if (!isSuccessfulFetchDashboardResult(result)) {
      setErrorPage(result.payload);
      return;
    }

    try {
      if (dashboard?.tabs?.length === 0) {
        await fetchDashboardCardData({ reload: false, clearCache: true });
      }
    } catch (error) {
      console.error(error);
      setErrorPage(error);
    }
  };

  useMount(initializePublicDashboard);
  useUnmount(() => dispatch(_cancelFetchDashboardCardData()));

  useUpdateEffect(() => {
    if (dashboardId !== prevProps.current.dashboardId) {
      initializePublicDashboard();
      return;
    } else if (!_.isEqual(prevProps.current.selectedTabId, selectedTabId)) {
      fetchDashboardCardData();
      dispatch(_fetchDashboardCardMetadata());
    } else if (!_.isEqual(parameterValues, prevProps.current.parameterValues)) {
      fetchDashboardCardData({ reload: false, clearCache: true });
    }
  }, [
    dashboardId,
    fetchDashboardCardData,
    initializePublicDashboard,
    parameterValues,
    selectedTabId,
  ]);

  if (!dashboardId || !dashboard) {
    return null;
  }

  const getCurrentTabDashcards = () => {
    if (!Array.isArray(dashboard?.dashcards)) {
      return [];
    }
    if (!selectedTabId) {
      return dashboard.dashcards;
    }
    return dashboard.dashcards.filter(
      dashcard => dashcard.dashboard_tab_id === selectedTabId,
    );
  };

  const getHiddenParameterSlugs = () => {
    const currentTabParameterIds = getCurrentTabDashcards().flatMap(
      dashcard =>
        dashcard.parameter_mappings?.map(mapping => mapping.parameter_id) ?? [],
    );
    const hiddenParameters = parameters.filter(
      parameter => !currentTabParameterIds.includes(parameter.id),
    );
    return hiddenParameters.map(parameter => parameter.slug).join(",");
  };

  const buttons = !isWithinIframe()
    ? getDashboardActions({ ...props, isPublic: true })
    : [];

  return (
    <EmbedFrame
      name={dashboard && dashboard.name}
      description={dashboard && dashboard.description}
      dashboard={dashboard}
      parameters={parameters}
      parameterValues={parameterValues}
      draftParameterValues={draftParameterValues}
      hiddenParameterSlugs={getHiddenParameterSlugs()}
      setParameterValue={(parameterId: ParameterId, value: any) =>
        dispatch(_setParameterValue(parameterId, value))
      }
      setParameterValueToDefault={(parameterId: string) =>
        dispatch(_setParameterValueToDefault(parameterId))
      }
      enableParameterRequiredBehavior
      actionButtons={
        buttons.length > 0 && <div className={CS.flex}>{buttons}</div>
      }
      dashboardTabs={
        dashboard?.tabs &&
        dashboard.tabs.length > 1 && (
          <DashboardTabs dashboardId={dashboardId} location={props.location} />
        )
      }
    >
      <LoadingAndErrorWrapper
        className={cx({
          [DashboardS.DashboardFullscreen]: props.isFullscreen,
          [DashboardS.DashboardNight]: props.isNightMode,
          [ParametersS.DashboardNight]: props.isNightMode,
          [ColorS.DashboardNight]: props.isNightMode,
        })}
        loading={!dashboard}
      >
        {() => (
          <DashboardContainer>
            <DashboardGridConnected
              isPublic
              className={CS.spread}
              mode={PublicMode as unknown as Mode}
              disableNewCardNavigation
            />
          </DashboardContainer>
        )}
      </LoadingAndErrorWrapper>
    </EmbedFrame>
  );
};

function isSuccessfulFetchDashboardResult(
  result: FetchDashboardResult,
): result is SuccessfulFetchDashboardResult {
  const hasError = "error" in result;
  return !hasError;
}
