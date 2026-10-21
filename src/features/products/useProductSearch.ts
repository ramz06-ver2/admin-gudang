import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../../shared/lib/supabaseClient";
import { TABLES } from "../../shared/lib/constants";
import { USE_MOCK } from "../../shared/lib/config";
import { mockProducts } from "../../mocks/products";
import { mapProduct } from "../../shared/lib/mappers";
import type { Product } from "../../shared/types";

export const useProductSearch = (keyword: string, limit = 30) => {
  const sanitize = (str: string) => str.replace(/[%_()\\'"]/g, "");
  const trimmed = sanitize(keyword).trim();

  const { data, isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["product-search", trimmed, limit],
    queryFn: async () => {
      if (USE_MOCK) {
        if (!trimmed) return mockProducts.slice(0, limit);
        const lower = trimmed.toLowerCase();
        return mockProducts.filter((p) => p.name.toLowerCase().includes(lower) || p.code.toLowerCase().includes(lower)).slice(0, limit);
      }

      let query = supabaseClient.from(TABLES.products).select("*").limit(limit).order("nama", { ascending: true }); 
      if (trimmed) {
        const words = trimmed.split(/\s+/).filter(Boolean);
        const orConditions = words.map((w) => `nama.ilike.%${w}%,kode.ilike.%${w}%`).join(",");
        query = query.or(orConditions);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(mapProduct);
    },
    staleTime: 10_000,
  });

  return { products: data ?? [], isLoading, refetch };
};