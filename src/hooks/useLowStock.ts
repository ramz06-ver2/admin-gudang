import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../utility/supabaseClient";
import { TABLES } from "../utility/constants";
import { USE_MOCK } from "../utility/config";
import { mockLowStockProducts } from "../mocks/products";
import type { Product } from "../types";

export const useLowStock = (limit = 5) => {
  const { data, isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["low-stock", limit],
    queryFn: async () => {
      // === MODE MOCK ===
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 300));
        return mockLowStockProducts.slice(0, limit);
      }

      // === MODE SUPABASE ===
      const { data, error } = await supabaseClient
        .from(TABLES.vLowStock)
        .select("*")
        .order("stok", { ascending: true })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  return {
    items: data ?? [],
    total: data?.length ?? 0,
    isLoading,
    refetch,
  };
};