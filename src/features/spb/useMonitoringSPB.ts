import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../../shared/lib/supabaseClient";
import { USE_MOCK } from "../../shared/lib/config";
import type { SPBDocumentGroup } from "../../shared/types";

const getSortNumber = (str: string | null) => {
  if (!str) return 999999;
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999999;
};

export const useMonitoringSPB = () => {
  const { data, isLoading, error, refetch } = useQuery<SPBDocumentGroup[]>({
    queryKey: ["monitoring-spb"],
    queryFn: async () => {
      if (USE_MOCK) return [];
      
      const { data, error } = await supabaseClient
        .from("v_spb_grouped")
        .select("*");

      if (error) throw error;

      const formattedData = (data ?? []).map((row: any) => ({
        id: `${row.no_spb || "NO_SPB"}_${row.no_po || "NO_PO"}`,
        spbNo: row.no_spb,
        poNo: row.no_po,
        date: row.tanggal || "-",
        itemsCount: row.items_count,
        sortNumber: getSortNumber(row.no_spb) + getSortNumber(row.no_po) * 0.01,
      }));

      // Sortir berdasarkan tanggal terbaru (descending)
      return formattedData.sort((a, b) => {
        const dateA = a.date !== "-" ? new Date(a.date).getTime() : 0;
        const dateB = b.date !== "-" ? new Date(b.date).getTime() : 0;
        if (dateA === dateB) {
            return a.sortNumber - b.sortNumber;
        }
        return dateB - dateA;
      });
    },
  });

  return { data: data ?? [], isLoading, error: error as Error | null, refetch };
};