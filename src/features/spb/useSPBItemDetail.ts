import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../../shared/lib/supabaseClient";
import { TABLES } from "../../shared/lib/constants";
import type { SPBItemDetail } from "../../shared/types";

export const useSPBItemDetail = (itemId: string | null) => {
  const enabled = !!itemId;
  const { data, isLoading, error } = useQuery<SPBItemDetail | null>({
    queryKey: ["spb-item-detail", itemId],
    queryFn: async () => {
      if (!itemId) return null;

      const { data, error } = await supabaseClient
        .from(TABLES.spb)
        .select(`
          *,
          po (
            no_po,
            tanggal_po,
            nama_supplier,
            supplier
          )
        `)
        .eq("id", itemId)
        .single();

      if (error) throw error;
      if (!data) return null;

      const dataPo = Array.isArray(data.po) ? data.po[0] : data.po;

      return {
        ...data,
        no_po: dataPo?.no_po || "-",
        tanggal_po: dataPo?.tanggal_po || null,
        supplier: dataPo?.nama_supplier || dataPo?.supplier || "-",
        nama_barang: data.nama_barang_spb || "-",
        tanggal_spb: data.tgl_spb || data.tanggal_pembuatan_spb || null,
        jumlah_permintaan: data.qty_permintaan || 0,
        satuan: data.satuan || "-",
        tanggal_datang: data.material_datang_tgl || null,
        ukuran: data.ukuran || "-",
        merk: data.merk || "-",
        spesifikasi_teknis: data.spesifikasi_teknis || "-",
        lokasi_pemasangan: data.lokasi_pemasangan || "-",
        rencana_pemasangan: data.rencana_pemasangan || "-",
        qty_datang: data.material_datang_qty ?? data.qty_datang ?? 0,
        satuan_datang: data.material_datang_satuan || data.satuan_datang || data.satuan || "-",
        lama_proses: data.lama_proses || "-",
        kurang_lebih: data.kurang_lebih || "-",
        keterangan: data.keterangan || "-",
        status: data.status || "-",
      } as SPBItemDetail;
    },
    enabled,
  });

  return {
    item: data ?? null,
    isLoading: enabled ? isLoading : false,
    error: error as Error | null,
  };
};
