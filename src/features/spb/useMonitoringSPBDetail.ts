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
      if (!spbNo && !poNo) return [];

      // ==========================================
      // SKENARIO 1: Jika yang diklik adalah SPB
      // ==========================================
      if (spbNo) {
        const { data, error } = await supabaseClient
          .from(TABLES.spb)
          .select(`
            *,
            po (
              no_po,
              tanggal_po
            )
          `)
          .eq("no_spb", spbNo);
          
        if (error) throw error;
        const rawData = data || [];
        
        return rawData.map((row: any) => {
          const dataPo = Array.isArray(row.po) ? row.po[0] : row.po;
          
          let rawNoPo = dataPo?.no_po;
          if (rawNoPo === "" || rawNoPo === "-" || String(rawNoPo).toLowerCase() === "null") rawNoPo = null;
          const finalNoPo = rawNoPo || null;
          const tglPo = dataPo?.tanggal_po || null;
          
          const req = row.qty_permintaan || 0;
          const arr = row.material_datang_qty || 0;
          const tglDatang = row.material_datang_tgl || null;

          let status = "Belum PO";
          if (tglDatang) {
            if (req === arr) status = "Datang Sesuai";
            else if (req < arr) status = "Datang Lebih";
            else if (req > arr) status = "Datang Kurang";
            else status = "Datang";
          } else if (finalNoPo && tglPo) {
            status = "Sudah PO";
          }

          return {
            ...row,
            no_po: finalNoPo || "-",
            tanggal_po: tglPo,
            nama_barang: row.nama_barang_spb || "Nama Kosong",
            jumlah_permintaan: req,
            satuan: row.satuan || "-",
            tanggal_datang: tglDatang,
            qty_datang: arr,
            status,
          } as SPBItemDetail;
        });
      } 
      
      // ==========================================
      // SKENARIO 2: Jika yang diklik adalah PO tanpa SPB
      // ==========================================
      if (poNo) {
        const { data, error } = await supabaseClient
          .from("po")
          .select(`*`)
          .eq("no_po", poNo);
          
        if (error) throw error;
        const rawData = data || [];
        
        return rawData.map((row: any) => {
          const tglDatang = row.material_datang_tgl || null;
          const arr = row.material_datang_qty || 0;
          
          let status = "Sudah PO";
          if (tglDatang) {
            status = "Datang"; // PO murni tidak punya qty_permintaan
          }

          return {
            id: row.id,
            no_spb: null,
            no_po: row.no_po || "-",
            tanggal_po: row.tanggal_po || null,
            nama_barang: row.nama_barang_po || "Nama Kosong",
            jumlah_permintaan: arr, // Fallback qty
            satuan: row.material_datang_satuan || "-",
            tanggal_datang: tglDatang,
            qty_datang: arr,
            status,
          } as SPBItemDetail;
        });
      }

      return [];
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