import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../../shared/lib/supabaseClient";
import { TABLES } from "../../shared/lib/constants";
import { USE_MOCK } from "../../shared/lib/config";
import { mockLowStockProducts } from "../../mocks/products";
import { mapProduct } from "../../shared/lib/mappers";
import type { Product } from "../../shared/types";

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