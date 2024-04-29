import type { Location } from "history";

import { PublicDashboard } from "metabase/public/containers/PublicDashboard/PublicDashboard";
import {
  setEmbedDashboardEndpoints,
  setPublicDashboardEndpoints,
} from "metabase/services";
import type { DashboardId } from "metabase-types/api";

export const PublicDashboardWrapper = ({
  location: {
    query: { uuid, token, dashboardId, tabSlug, ...parameters },
  },
}: {
  location: Location<
    {
      uuid?: string;
      token?: string;
      tabSlug?: string;
      dashboardId?: DashboardId;
    } & Record<string, string | string[] | undefined>
  >;
}) => {
  const dashId = (dashboardId || uuid || token) as string;

  if (uuid) {
    setPublicDashboardEndpoints();
  } else if (token) {
    setEmbedDashboardEndpoints();
  }

  return <PublicDashboard dashboardId={dashId} tab={tabSlug} queryParams={parameters} />;
};
