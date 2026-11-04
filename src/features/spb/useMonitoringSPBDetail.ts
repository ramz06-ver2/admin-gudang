// src/features/spb/useMonitoringSPBDetail.ts
import { useQuery } from "@tanstack/react-query";
import { canViewRestrictedSpb } from "./accessRules";
import {
  fetchDetailByPo,
  fetchDetailBySpb,
  fetchDetailBySuratJalan,
} from "./api";
import type { ItemSource, MonitoringDetailItem } from "./types";

export type { ItemSource, MonitoringDetailItem };

export const useMonitoringSPBDetail = (
  spbNo: string | null,
  poNo: string | null,
  sjNo: string | null = null,
  judulSpb: string | null = null,
) => {
  const enabled = !!(spbNo || poNo || sjNo);
  const canViewRestricted = canViewRestrictedSpb();

  const { data, isLoading, error } = useQuery<MonitoringDetailItem[]>({
    queryKey: [
      "monitoring-spb-detail",
      spbNo,
      poNo,
      sjNo,
      judulSpb,
      canViewRestricted,
    ],
    queryFn: async () => {
      if (spbNo) return fetchDetailBySpb(spbNo, judulSpb, canViewRestricted);
      if (poNo) return fetchDetailByPo(poNo);
      if (sjNo) return fetchDetailBySuratJalan(sjNo);
      return [];
    },
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    items: data ?? [],
    isLoading: enabled ? isLoading : false,
    error: error as Error | null,
  };
};
