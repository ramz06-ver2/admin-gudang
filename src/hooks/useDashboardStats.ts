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
  lowStockCount: 0,
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

      const [productsRes, entriesRes, lowStockRes] = await Promise.all([
        supabaseClient.from(TABLES.products).select("stok"),
        supabaseClient
          .from(TABLES.stockEntries)
          .select("jumlah")
          .eq("tanggal", today),
        supabaseClient
          .from(TABLES.vLowStock)
          .select("id", { count: "exact", head: true }),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (entriesRes.error) throw entriesRes.error;
      if (lowStockRes.error) throw lowStockRes.error;

      const totalProducts = productsRes.data?.length ?? 0;
      const totalStock =
        productsRes.data?.reduce(
          (sum, p: { stok: number | null }) => sum + (p.stok ?? 0),
          0,
        ) ?? 0;
      const todayInbound =
        entriesRes.data?.reduce(
          (sum, e: { jumlah: number | null }) => sum + (e.jumlah ?? 0),
          0,
        ) ?? 0;
      const lowStockCount = lowStockRes.count ?? 0;

      return { totalProducts, totalStock, todayInbound, lowStockCount };
    },
  });

  return {
    stats: query.data ?? EMPTY_STATS,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};