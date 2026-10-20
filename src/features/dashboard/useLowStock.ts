import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../utility/supabaseClient";
import { TABLES } from "../utility/constants";
import { USE_MOCK } from "../utility/config";
import { mockLowStockProducts } from "../mocks/products";
import { mapProduct } from "../utility/mappers";
import type { Product } from "../types";

const LOW_STOCK_THRESHOLD = 5;

export const useLowStock = (limit = 5) => {
  const { data, isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["low-stock", limit],
    queryFn: async () => {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 300));
        return mockLowStockProducts.slice(0, limit);
      }

      const { data, error } = await supabaseClient
        .from(TABLES.products)
        .select("*")
        .lte("stok", LOW_STOCK_THRESHOLD)
        .order("stok", { ascending: true })
        .limit(limit);

      if (error) throw error;

      return (data ?? []).map((row) => {
        const product = mapProduct(row as Record<string, unknown>);
        return {
          ...product,
          minStock: LOW_STOCK_THRESHOLD,
          status: product.stock <= 0 ? "out" : "low",
        };
      });
    },
  });

  return {
    items: data ?? [],
    total: data?.length ?? 0,
    isLoading,
    refetch,
  };
};