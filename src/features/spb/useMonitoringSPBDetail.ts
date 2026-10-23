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
      
      let query = supabaseClient.from(TABLES.spb).select(`
        *,
        po (
          no_po,
          tanggal_po
        )
      `);

      if (spbNo) {
        query = query.eq("no_spb", spbNo);
      } else if (poNo) {
        query = query.is("no_spb", null).eq("id_po", poNo);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row: any) => {
        const dataPo = Array.isArray(row.po) ? row.po[0] : row.po;
        const noPo = dataPo?.no_po || null;
        const tglPo = dataPo?.tanggal_po || null;
        
        const req = row.qty_permintaan || 0;
        const arr = row.material_datang_qty || 0;
        const tglDatang = row.material_datang_tgl || null;

        // ✅ PERBAIKAN LOGIKA STATUS DETAIL
        let status = "Belum PO";
        
        if (tglDatang) {
          // Jika sudah ada tanggal datang, langsung cek kuantitasnya
          if (req === arr) {
            status = "Datang Sesuai";
          } else if (req < arr) {
            status = "Datang Lebih";  // Minta 5, datang 10
          } else if (req > arr) {
            status = "Datang Kurang"; // Minta 10, datang 5
          } else {
            status = "Datang"; // Fallback jika qty null
          }
        } else if (noPo && tglPo) {
          // Jika belum datang, tapi sudah ada nomor dan tanggal PO
          status = "Sudah PO";
        }

        return {
          ...row,
          no_po: noPo || "-",
          tanggal_po: tglPo,
          nama_barang: row.nama_barang_spb || "Nama Kosong",
          jumlah_permintaan: req,
          satuan: row.satuan || "-",
          tanggal_datang: tglDatang,
          qty_datang: arr,
          status, // ✅ Masukkan status ke data
        };
      }) as SPBItemDetail[];
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