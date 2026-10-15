import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../utility/supabaseClient";
import { TABLES } from "../utility/constants";
import { USE_MOCK } from "../utility/config";
import { mockProducts } from "../mocks/products";
import { mapProduct } from "../utility/mappers";
import type { Product } from "../types";

/**
 * Fetch produk dari Supabase.
 * @param category - opsional: "Material" atau "Alat Bantu"
 */
export const useProducts = (category?: string) => {
  const { data, isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["products", category ?? "all"],
    queryFn: async () => {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 300));
        return category
          ? mockProducts.filter((p) => p.category === category)
          : mockProducts;
      }

      let query = supabaseClient
        .from(TABLES.products)
        .select("*")
        .order("kode", { ascending: true });

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
