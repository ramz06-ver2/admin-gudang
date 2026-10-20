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
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 300));
        return mockStockInChart.slice(-days);
      }

      const fromDate = dayjs().subtract(days, "day").format("YYYY-MM-DD");

      const { data, error } = await supabaseClient
        .from(TABLES.stockEntries)
        .select("tanggal_pengiriman, jumlah_barang_masuk")
        .gte("tanggal_pengiriman", fromDate)
        .order("tanggal_pengiriman", { ascending: true });

      if (error) throw error;

      const grouped = (data ?? []).reduce<Record<string, number>>(
        (
          acc,
          row: {
            tanggal_pengiriman: string | null;
            jumlah_barang_masuk: number | null;
          },
        ) => {
          if (!row.tanggal_pengiriman) return acc;
          acc[row.tanggal_pengiriman] =
            (acc[row.tanggal_pengiriman] ?? 0) + (row.jumlah_barang_masuk ?? 0);
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