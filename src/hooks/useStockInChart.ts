import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { supabaseClient } from "../utility/supabaseClient";
import { TABLES } from "../utility/constants";
import { USE_MOCK } from "../utility/config";
import { mockStockInChart } from "../mocks/stockEntries";
import type { StockInChartItem } from "../types";

export const useStockInChart = (days = 30) => {
  const { data, isLoading, refetch } = useQuery<StockInChartItem[]>({
    queryKey: ["stock-in-chart", days],
    queryFn: async () => {
      // === MODE MOCK ===
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 300));
        return mockStockInChart.slice(-days);
      }

      // === MODE SUPABASE ===
      const fromDate = dayjs().subtract(days, "day").format("YYYY-MM-DD");

      const { data, error } = await supabaseClient
        .from(TABLES.stockEntries)
        .select("tanggal, jumlah")
        .gte("tanggal", fromDate)
        .order("tanggal", { ascending: true });

      if (error) throw error;

      // Group by date
      const grouped = (data ?? []).reduce<Record<string, number>>(
        (acc, row: { tanggal: string; jumlah: number }) => {
          acc[row.tanggal] = (acc[row.tanggal] ?? 0) + row.jumlah;
          return acc;
        },
        {},
      );

      return Object.entries(grouped).map(([date, total]) => ({
        date,
        total,
      }));
    },
  });

  return {
    items: data ?? [],
    isLoading,
    refetch,
  };
};