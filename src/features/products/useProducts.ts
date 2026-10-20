import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../utility/supabaseClient";
import { TABLES } from "../utility/constants";
import { USE_MOCK } from "../utility/config";
import { mockProducts } from "../mocks/products";
import { mapProduct } from "../utility/mappers";
import type { Product } from "../types";

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