// src/features/spb/hooks/useSPBItem.ts
import { useQuery } from "@tanstack/react-query";
import type { SPBItemDetail } from "../../../shared/types";
import { fetchSingleItemById } from "../api";

export const useSPBItem = (id: string | undefined, type: string) => {
  const enabled = !!id;
  return useQuery<SPBItemDetail | null, Error>({
    queryKey: ["spb-item", id, type],
    queryFn: async () => {
      if (!id) return null;
      return fetchSingleItemById(id, type);
    },
    enabled,
    retry: false,
  });
};

