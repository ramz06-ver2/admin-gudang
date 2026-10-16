import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../utility/supabaseClient";
import { TABLES } from "../utility/constants";

export interface SPBDocumentGroup {
  id: string;
  spbNo: string | null;
  poNo: string | null;
  date: string;
  status: string;
  itemsCount: number;
  sortNumber: number;
}

const getSortNumber = (str: string | null) => {
  if (!str) return 999999;
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999999;
};

export const useMonitoringSPB = () => {
  const { data, isLoading, refetch } = useQuery<SPBDocumentGroup[]>({
    queryKey: ["monitoring-spb"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from(TABLES.spb)
        .select("no_spb, tanggal_pembuatan_spb, no_po, tanggal_po, status, tanggal_datang")
        .order("no_spb", { ascending: true });

      if (error) throw error;
      
      const groups: Record<string, SPBDocumentGroup> = {};
      
      (data ?? []).forEach((item: any) => {
        const key = `${item.no_spb || "NO_SPB"}_${item.no_po || "NO_PO"}`;
        
        if (!groups[key]) {
          groups[key] = {
            id: key,
            spbNo: item.no_spb,
            poNo: item.no_po,
            date: item.tanggal_pembuatan_spb || item.tanggal_po || item.tanggal_datang || "-",
            status: item.status,
            itemsCount: 0,
            sortNumber: getSortNumber(item.no_spb) + (getSortNumber(item.no_po) * 0.01),
          };
        }
        
        // Aturan status: Jika ada satupun barang yang BELUM DATANG, status card adalah BELUM DATANG
        if (item.status === "BELUM DATANG") {
          groups[key].status = "BELUM DATANG";
        }
        
        groups[key].itemsCount += 1;
      });

      return Object.values(groups);
    },
  });

  return {
    data: data ?? [],
    isLoading,
    refetch,
  };
};