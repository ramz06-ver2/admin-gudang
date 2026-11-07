import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { formatDate } from "../../../shared/lib/format";
import { QUERY_KEYS, STALE_TIMES } from "../../../shared/lib/queryKeys";
import { canViewRestrictedSpb } from "../spb-monitoring/accessRules";
import {
  getSpbStatusCache,
  isArrivedStatus,
  selectArrivalEntries,
  selectSpbOnlyEntries,
} from "../shared/spbStatusCache";

export interface SpbBarItem {
  label: string;
  value: number;
  type: string;
}

export interface SpbLinePoint {
  date: string;
  rawDate: string;
  type: string;
  /** "SPB Terkirim" = jumlah SPB (dokumen); "Barang Datang" = jumlah barang. */
  value: number;
  lamaProses?: number;
}

export interface SpbAnalyticsData {
  totalItems: number;
  itemsNotPo: number;
  itemsWithPoNotArrived: number;
  itemsArrived: number;
  barData: SpbBarItem[];
  lineData: SpbLinePoint[];
}

export const BAR_COLORS = {
  diajukan: "#faad14", // Kuning
  po: "#1677ff", // Biru
  datang: "#52c41a", // Hijau
} as const;

export const useSpbAnalytics = () => {
  const canViewRestricted = canViewRestrictedSpb();

  return useQuery<SpbAnalyticsData>({
    queryKey: QUERY_KEYS.spbAnalytics(canViewRestricted),
    staleTime: STALE_TIMES.SPB_ANALYTICS,
    queryFn: async ({ signal }): Promise<SpbAnalyticsData> => {
      // Status diambil dari cache; distribusi bar menggunakan entri SPB,
      // sedangkan timeline "Barang Datang" menggunakan seluruh kedatangan aktual (SJ + SPB langsung).
      const cache = await getSpbStatusCache({ canViewRestricted, signal });
      const rows = selectSpbOnlyEntries(cache);
      const arrivalRows = selectArrivalEntries(cache);

      let itemsNotPo = 0;
      let itemsWithPoNotArrived = 0;
      let itemsArrived = 0;

      // tanggal -> kumpulan NOMOR SPB unik (10, 11, 13, 14 => 4 SPB)
      const spbDateMap = new Map<string, Set<string>>();
      const arrivalDateMap = new Map<string, { count: number; totalDays: number }>();

      rows.forEach((e) => {
        if (isArrivedStatus(e.status)) {
          itemsArrived += 1;
        } else if (e.status === "Sudah PO") {
          itemsWithPoNotArrived += 1;
        } else {
          itemsNotPo += 1; // Belum PO / Belum Diproses
        }

        if (e.tglSpb && e.noSpb) {
          const d = dayjs(e.tglSpb);
          if (d.isValid()) {
            const key = d.format("YYYY-MM-DD");
            const set = spbDateMap.get(key) ?? new Set<string>();
            set.add(e.noSpb);
            spbDateMap.set(key, set);
          }
        }
      });

      arrivalRows.forEach((e) => {
        const arr = e.tglDatang ? dayjs(e.tglDatang) : null;
        if (!arr?.isValid()) return;
        const key = arr.format("YYYY-MM-DD");
        const cur = arrivalDateMap.get(key) ?? { count: 0, totalDays: 0 };
        cur.count += 1;
        if (e.tglSpb) {
          const start = dayjs(e.tglSpb);
          if (start.isValid()) {
            const days = arr.diff(start, "day");
            if (days >= 0) cur.totalDays += days;
          }
        }
        arrivalDateMap.set(key, cur);
      });

      const totalPo = itemsWithPoNotArrived + itemsArrived;

      const barData: SpbBarItem[] = [
        { label: "Diajukan", value: itemsNotPo, type: "Diajukan" },
        { label: "Sudah PO", value: totalPo, type: "Sudah PO" },
        { label: "Sudah Datang", value: itemsArrived, type: "Sudah Datang" },
      ];

      const lineData: SpbLinePoint[] = [];

      [...spbDateMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([rawDate, spbSet]) => {
          lineData.push({
            date: formatDate(rawDate),
            rawDate,
            type: "SPB Terkirim",
            value: spbSet.size,
          });
        });

      [...arrivalDateMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([rawDate, info]) => {
          lineData.push({
            date: formatDate(rawDate),
            rawDate,
            type: "Barang Datang",
            value: info.count,
            lamaProses: info.count > 0 ? Math.round(info.totalDays / info.count) : 0,
          });
        });

      return {
        totalItems: rows.length,
        itemsNotPo,
        itemsWithPoNotArrived,
        itemsArrived,
        barData,
        lineData,
      };
    },
  });
};
