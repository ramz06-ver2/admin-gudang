import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../utility/supabaseClient";
import { USE_MOCK } from "../utility/config";
import type { SPBDocumentGroup } from "../types";

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
      
      // ✅ PERBAIKAN: Mengambil data dari VIEW (agregasi server-side)
      const { data, error } = await supabaseClient
        .from("v_spb_grouped")
        .select("*")
        .order("tanggal", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: `${row.no_spb || "NO_SPB"}_${row.no_po || "NO_PO"}`,
        spbNo: row.no_spb,
        poNo: row.no_po,
        date: row.tanggal || "-",
        status: row.status,
        itemsCount: row.items_count,
        sortNumber: getSortNumber(row.no_spb) + getSortNumber(row.no_po) * 0.01,
      }));
    },
  });

  return { data: data ?? [], isLoading, error: error as Error | null, refetch };
};