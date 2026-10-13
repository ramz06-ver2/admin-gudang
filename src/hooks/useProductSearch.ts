import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../utility/supabaseClient";
import { TABLES } from "../utility/constants";
import { USE_MOCK } from "../utility/config";
import { mockProducts } from "../mocks/products";
import type { Product } from "../types";

export const useProductSearch = (keyword: string, limit = 8) => {
  const trimmed = keyword.trim();

  const { data, isLoading } = useQuery<Product[]>({
    queryKey: ["product-search", trimmed, limit],
    queryFn: async () => {
      // === MODE MOCK ===
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 150));
        if (!trimmed) return mockProducts.slice(0, limit);
        const lower = trimmed.toLowerCase();
        return mockProducts
          .filter(
            (p) =>
              p.name.toLowerCase().includes(lower) ||
              p.code.toLowerCase().includes(lower),
          )
          .slice(0, limit);
      }

      // === MODE SUPABASE ===
      let query = supabaseClient
        .from(TABLES.vProductsFull)
        .select("*")
        .limit(limit);

      if (trimmed) {
        query = query.or(`name.ilike.%${trimmed}%,code.ilike.%${trimmed}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Product[];
    },
    enabled: true,
    staleTime: 10_000,
  });

  return {
    products: data ?? [],
    isLoading,
  };
};