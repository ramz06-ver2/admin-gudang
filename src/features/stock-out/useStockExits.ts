import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { supabaseClient } from "../../shared/lib/supabaseClient";
import { TABLES } from "../../shared/lib/constants";
import { USE_MOCK } from "../../shared/lib/config";
import { mockStockExits } from "../../mocks/stockExitList";
import { mapStockExits } from "../../shared/lib/mappers";
import type { StockExit } from "../../shared/types";

interface Options { onlyToday?: boolean; breakdown?: boolean; limit?: number; }

export const useStockExits = ({ onlyToday = false, breakdown, limit = 50 }: Options = {}) => {
  const { data, isLoading, refetch } = useQuery<StockExit[]>({
    queryKey: ["stock-exits", onlyToday, breakdown, limit],
    queryFn: async () => {
      if (USE_MOCK) return mockStockExits;
      let query = supabaseClient.from(TABLES.stockExits).select("*").order("created_at", { ascending: false });

      if (onlyToday) {
        const start = dayjs().startOf("day").toISOString();
        const end = dayjs().endOf("day").toISOString();
        query = query.gte("created_at", start).lte("created_at", end);
      }
      if (breakdown !== undefined) query = query.eq("is_breakdown", breakdown);
      
      // ✅ PERBAIKAN: Batasi data history agar tabel tidak hang
      query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;
      return mapStockExits(data ?? []);
    },
    refetchInterval: USE_MOCK ? false : 30_000,
  });
  return { exits: data ?? [], isLoading, refetch };
};