// src/features/spb/hooks/useSPBItem.ts
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS, STALE_TIMES } from "../../../../shared/lib/queryKeys";
import type { SPBItemDetail } from "../../../../shared/types";
import { fetchSingleItemById } from "../api";

export const useSPBItem = (id: string | undefined, type: string) => {
  const enabled = !!id;
  return useQuery<SPBItemDetail | null, Error>({
    queryKey: QUERY_KEYS.spbItem(id, type),
    staleTime: STALE_TIMES.SPB_ITEM,
    queryFn: async () => {
      if (!id) return null;
      return fetchSingleItemById(id, type);
    },
    enabled,
    retry: false,
  });
};
