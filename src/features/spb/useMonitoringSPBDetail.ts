import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../../shared/lib/supabaseClient";
import { TABLES } from "../../shared/lib/constants";

export interface SPBItemDetail {
  id: number;
  no_spb: string | null;
  no_po: string | null;
  nama_barang: string;
  jumlah_permintaan: number | null;
  satuan: string | null;
  status: string;
  tanggal_po: string | null;
  tanggal_datang: string | null;
  tanggal_pembuatan_spb?: string | null;
}

export const useMonitoringSPBDetail = (
  spbNo: string | null,
  poNo: string | null,
) => {
  const { data, isLoading, error, refetch } = useQuery<SPBItemDetail[]>({
    queryKey: ["monitoring-spb-detail", spbNo, poNo],
    queryFn: async () => {
      let query = supabaseClient.from(TABLES.spb).select("*");

      if (spbNo && poNo) {
        query = query.eq("no_spb", spbNo).eq("no_po", poNo);
      } else if (spbNo) {
        // SPB tanpa PO
        query = query.eq("no_spb", spbNo).is("no_po", null);
      } else if (poNo) {
        // PO tanpa SPB
        query = query.is("no_spb", null).eq("no_po", poNo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as SPBItemDetail[];
    },
    enabled: !!(spbNo || poNo),
  });

  return {
    items: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
};