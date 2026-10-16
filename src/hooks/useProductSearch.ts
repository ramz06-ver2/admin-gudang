import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../utility/supabaseClient";
import { TABLES } from "../utility/constants";
import { USE_MOCK } from "../utility/config";
import { mockProducts } from "../mocks/products";
import { mapProduct } from "../utility/mappers";
import type { Product } from "../types";

export const useProductSearch = (keyword: string, limit = 30) => { // ✅ FIX 6: Limit dinaikkan ke 30
  // ✅ FIX 3: Sanitize input (Hapus karakter liar %, _, (, ) dll yang bikin query error)
  const sanitize = (str: string) => str.replace(/[%_()\\'"]/g, "");
  const trimmed = sanitize(keyword).trim();

  const { data, isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["product-search", trimmed, limit],
    queryFn: async () => {
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

      let query = supabaseClient
        .from(TABLES.products)
        .select("*")
        .limit(limit)
        // ✅ FIX 5: .order() agar hasil tidak acak dan relevance bagus
        .order("nama", { ascending: true }); 

      if (trimmed) {
        // ✅ FIX 2: Split per kata, jadikan OR.
        // Hasilnya: nama.ilike.%kata1%,kode.ilike.%kata1%,nama.ilike.%kata2%...
        // Agar multi-kata atau urutan terbalik tetap matching.
        const words = trimmed.split(/\s+/).filter(Boolean);
        const orConditions = words
          .map((w) => `nama.ilike.%${w}%,kode.ilike.%${w}%`)
          .join(",");
        
        query = query.or(orConditions);
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