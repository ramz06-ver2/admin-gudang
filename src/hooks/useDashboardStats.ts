import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../utility/supabaseClient";
import { TABLES } from "../utility/constants";
import { USE_MOCK } from "../utility/config";
import { getMockDashboardStats } from "../mocks/dashboard";
import type { DashboardStats } from "../types";

// ============================================
// Tipe return eksplisit
// ============================================
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
      // === MODE MOCK ===
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 300));
        return getMockDashboardStats();
      }

      // === MODE SUPABASE ===
      const today = new Date().toISOString().split("T")[0];

      const [productsRes, inboundRes, outboundRes] = await Promise.all([
        supabaseClient.from(TABLES.products).select("stok"),
        supabaseClient
          .from(TABLES.stockEntries)
          .select("jumlah")
          .eq("tanggal", today),
        supabaseClient
          .from(TABLES.stockExits)
          .select("items")
          .eq("date", today),
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
          (sum, e: { jumlah: number | null }) => sum + (e.jumlah ?? 0),
          0,
        ) ?? 0;

      // Hitung total quantity dari items[] di stock exits
      const todayOutbound =
        outboundRes.data?.reduce(
          (sum, exit: { items: Array<{ quantity: number }> }) =>
            sum + (exit.items?.reduce((s, i) => s + (i.quantity ?? 0), 0) ?? 0),
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
