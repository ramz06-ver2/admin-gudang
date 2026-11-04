// src/features/spb/useMonitoringSPB.ts
import { useQuery } from "@tanstack/react-query";
import { USE_MOCK } from "../../shared/lib/config";
import type { SPBDocumentGroup } from "../../shared/types";
import { canViewRestrictedSpb } from "./accessRules";
import { fetchMonitoringRawData, updateDocumentTitle } from "./api";
import { groupMonitoringData } from "./utils/groupMonitoringData";
import { getTitleOverrides, saveTitleOverride } from "./utils/titleOverrides";

export { getTitleOverrides, saveTitleOverride, updateDocumentTitle };

export const useMonitoringSPB = () => {
  const canViewRestricted = canViewRestrictedSpb();

  const { data, isLoading, error, refetch } = useQuery<SPBDocumentGroup[]>({
    queryKey: ["monitoring-spb", canViewRestricted],
    queryFn: async () => {
      if (USE_MOCK) return [];

      const overrides = getTitleOverrides();
      const { allSpbData, poData, sjData } = await fetchMonitoringRawData();

      return groupMonitoringData({
        allSpbData,
        poData,
        sjData,
        canViewRestricted,
        overrides,
      });
    },
  });

  return {
    data: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
};
