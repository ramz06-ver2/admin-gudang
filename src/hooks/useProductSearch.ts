import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../utility/supabaseClient";
import { TABLES } from "../utility/constants";
import { USE_MOCK } from "../utility/config";
import { mockProducts } from "../mocks/products";
import { mapProduct } from "../utility/mappers";
import type { Product } from "../types";

export const useProductSearch = (keyword: string, limit = 8) => {
  const trimmed = keyword.trim();

  const { data, isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["product-search", trimmed, limit],
    queryFn: async () => {
      // === MOCK ===
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

      // === SUPABASE ===
      let query = supabaseClient
        .from(TABLES.products) // "barang"
        .select("*")
        .limit(limit);

      if (trimmed) {
        query = query.or(`nama.ilike.%${trimmed}%,kode.ilike.%${trimmed}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(mapProduct);
    },
    staleTime: 10_000,
  });

  return {
    products: data ?? [],
    isLoading,
    refetch,
  };
};
