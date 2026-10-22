import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../../shared/lib/supabaseClient";
import { TABLES } from "../../shared/lib/constants";
import type { SPBItemDetail } from "../../shared/types";

export const useMonitoringSPBDetail = (
  spbNo: string | null,
  poNo: string | null,
) => {
  const { data, isLoading, error, refetch } = useQuery<SPBItemDetail[]>({
    queryKey: ["monitoring-spb-detail", spbNo, poNo],
    queryFn: async () => {
      let query = supabaseClient.from(TABLES.spb).select("*");

      if (spbNo) {
        // 💥 HACK: Ganti karakter '#' dengan '_' (SQL Wildcard)
        // Ini mencegah URL terpotong oleh sistem dan menjamin data pasti terbaca!
        const safeSpbNo = spbNo.replace(/#/g, "_");
        query = query.ilike("no_spb", safeSpbNo);
      } else if (poNo) {
        const safePoNo = poNo.replace(/#/g, "_");
        query = query.is("no_spb", null).ilike("id_po", safePoNo);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Pemetaan data agar tidak error di tabel UI
      return (data ?? []).map((row: any) => ({
        ...row,
        no_po: row.id_po && String(row.id_po).trim() !== "" ? String(row.id_po) : "-",
        nama_barang: row.nama_barang || "Nama Barang Kosong",
        jumlah_permintaan: row.jumlah_permintaan || 0,
        satuan: row.satuan || "-",
      })) as SPBItemDetail[];
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