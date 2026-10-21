import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../../shared/lib/supabaseClient";
import { TABLES } from "../../shared/lib/constants";
import { USE_MOCK } from "../../shared/lib/config";
import { mockProducts } from "../../mocks/products";
import { mapProduct } from "../../shared/lib/mappers";
import type { Product } from "../../shared/types";

export const useProducts = (category?: string) => {
  const { data, isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["products", category ?? "all"],
    queryFn: async () => {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 300));
        const filtered = category
          ? mockProducts.filter((p) => p.category === category)
          : mockProducts;
        return [...filtered].sort((a, b) => b.stock - a.stock);
      }

      let query = supabaseClient
        .from(TABLES.products)
        .select("*")
        // ✅ Urutkan berdasarkan stok terbanyak terlebih dahulu
        .order("stok", { ascending: false })
        .order("nama", { ascending: true });

      if (category) {
        query = query.eq("kategori", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(mapProduct);
    },
  });

  return {
    products: data ?? [],
    isLoading,
    refetch,
  };
};