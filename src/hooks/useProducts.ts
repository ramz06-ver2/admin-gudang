import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../utility/supabaseClient";
import { TABLES } from "../utility/constants";
import { USE_MOCK } from "../utility/config";
import { mockProducts } from "../mocks/products";
import { mapProduct } from "../utility/mappers";
import type { Product } from "../types";

export const useProducts = () => {
  const { data, isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 300));
        return mockProducts;
      }

      const { data, error } = await supabaseClient
        .from(TABLES.products)
        .select("*")
        .order("kode", { ascending: true });

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
