import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { supabaseClient } from "../utility/supabaseClient";
import { TABLES } from "../utility/constants";
import { USE_MOCK } from "../utility/config";
import { getMockDashboardStats } from "../mocks/dashboard";
import type { DashboardStats } from "../types";

export interface UseDashboardStatsResult {
  stats: DashboardStats;
  isLoading: boolean;
  refetch: () => void;
}

const EMPTY_STATS: DashboardStats = {
  totalProducts: 0,
  totalStock: 0,
  todayInbound: 0,
  todayOutbound: 0,
};

export const useDashboardStats = (): UseDashboardStatsResult => {
  const query = useQuery<DashboardStats, Error, DashboardStats>({
    queryKey: ["dashboard-stats"],
    refetchInterval: USE_MOCK ? false : 60_000,
    queryFn: async (): Promise<DashboardStats> => {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 300));
        return getMockDashboardStats();
      }

      const today = dayjs().format("YYYY-MM-DD");
      const startOfDay = dayjs().startOf("day").toISOString();
      const endOfDay = dayjs().endOf("day").toISOString();

      const [productsRes, inboundRes, outboundRes] = await Promise.all([
        supabaseClient.from(TABLES.products).select("stok"),
        supabaseClient
          .from(TABLES.stockEntries)
          .select("jumlah_barang_masuk")
          .eq("tanggal_pengiriman", today),
        supabaseClient
          .from(TABLES.stockExits)
          .select("jumlah_barang_keluar")
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (inboundRes.error) throw inboundRes.error;
      if (outboundRes.error) throw outboundRes.error;

      const totalProducts = productsRes.data?.length ?? 0;
      const totalStock =
        productsRes.data?.reduce(
          (sum, p: { stok: number | null }) => sum + (p.stok ?? 0),
          0,
        ) ?? 0;

      const todayInbound =
        inboundRes.data?.reduce(
          (sum, e: { jumlah_barang_masuk: number | null }) =>
            sum + (e.jumlah_barang_masuk ?? 0),
          0,
        ) ?? 0;

      const todayOutbound =
        outboundRes.data?.reduce(
          (sum, exit: { jumlah_barang_keluar: number | null }) =>
            sum + (exit.jumlah_barang_keluar ?? 0),
          0,
        ) ?? 0;

      return { totalProducts, totalStock, todayInbound, todayOutbound };
    },
  });

  return {
    stats: query.data ?? EMPTY_STATS,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};