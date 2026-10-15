import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { supabaseClient } from "../utility/supabaseClient";
import { TABLES } from "../utility/constants";
import { USE_MOCK } from "../utility/config";
import { mockStockExits } from "../mocks/stockExitList";
import { mapStockExits } from "../utility/mappers";
import type { StockExit } from "../types";

interface Options {
  onlyToday?: boolean;
  breakdown?: boolean; // true = breakdown, false = non-breakdown, undefined = semua
}

export const useStockExits = ({
  onlyToday = false,
  breakdown,
}: Options = {}) => {
  const { data, isLoading, refetch } = useQuery<StockExit[]>({
    queryKey: ["stock-exits", onlyToday, breakdown],
    queryFn: async () => {
      // === MOCK ===
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 300));
        return mockStockExits;
      }

      // === SUPABASE ===
      let query = supabaseClient
        .from(TABLES.stockExits)
        .select("*")
        .order("created_at", { ascending: false });

      if (onlyToday) {
        const startOfDay = dayjs().startOf("day").toISOString();
        const endOfDay = dayjs().endOf("day").toISOString();
        query = query.gte("created_at", startOfDay).lte("created_at", endOfDay);
      }

      if (breakdown !== undefined) {
        query = query.eq("is_breakdown", breakdown);
      }

      const { data, error } = await query;
      if (error) throw error;

      return mapStockExits(data ?? []);
    },
    refetchInterval: USE_MOCK ? false : 30_000,
  });

  return {
    exits: data ?? [],
    isLoading,
    refetch,
  };
};
