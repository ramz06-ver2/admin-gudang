import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../../shared/lib/supabaseClient";
import { USE_MOCK } from "../../shared/lib/config";
import type { SPBDocumentGroup } from "../../shared/types";

const getSortNumber = (val: unknown): number => {
  if (val === null || val === undefined || val === "") return 999999;
  const s = String(val);
  const match = s.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999999;
};

const toStrOrNull = (val: unknown): string | null => {
  if (val === null || val === undefined || val === "") return null;
  return String(val);
};

export const useMonitoringSPB = () => {
  const { data, isLoading, error, refetch } = useQuery<SPBDocumentGroup[]>({
    queryKey: ["monitoring-spb"],
    queryFn: async () => {
      if (USE_MOCK) return [];

      const { data, error } = await supabaseClient
        .from("spb")
        .select(`
          id,
          no_spb,
          tgl_spb,
          material_datang_tgl,
          qty_permintaan,
          material_datang_qty,
          po:po!id_po (
            no_po,
            tanggal_po
          )
        `);

      if (error) throw error;

      const groups = new Map<string, { 
        data: SPBDocumentGroup; 
        hasAnyPO: boolean; 
        hasAnyArrival: boolean;
        latestTimestamp: number; // ✅ Untuk melacak tanggal paling baru
      }>();

      (data ?? []).forEach((row: any) => {
        const spbNo = toStrOrNull(row.no_spb);
        const poData = Array.isArray(row.po) ? row.po[0] : row.po;
        const poNo = toStrOrNull(poData?.no_po);
        
        const key = spbNo || `PO_${poNo}`;

        if (!groups.has(key)) {
          groups.set(key, {
            data: {
              id: key,
              spbNo,
              poNo,
              date: "-", // Awalnya kosong
              itemsCount: 0,
              sortNumber: getSortNumber(spbNo) + getSortNumber(poNo) * 0.01,
              status: "Belum PO"
            },
            hasAnyPO: false,
            hasAnyArrival: false,
            latestTimestamp: 0
          });
        }

        const group = groups.get(key)!;
        group.data.itemsCount += 1;

        // Cek status PO & Kedatangan
        if (poNo && poData?.tanggal_po) group.hasAnyPO = true;
        if (row.material_datang_tgl) group.hasAnyArrival = true;

        if (poNo) {
          if (!group.data.poNo) group.data.poNo = poNo;
          else if (!group.data.poNo.includes(poNo)) group.data.poNo += `, ${poNo}`;
          group.data.sortNumber = getSortNumber(spbNo) + getSortNumber(poNo) * 0.01;
        }

        // ✅ LOGIKA TANGGAL PALING BARU:
        // Kumpulkan semua kemungkinan tanggal dari barang ini
        const datesToCheck = [
          row.tgl_spb, 
          poData?.tanggal_po, 
          row.material_datang_tgl
        ];

        datesToCheck.forEach((dateStr) => {
          if (dateStr) {
            const time = new Date(dateStr).getTime();
            // Jika tanggal ini valid dan lebih baru dari yang tersimpan di grup
            if (!isNaN(time) && time > group.latestTimestamp) {
              group.latestTimestamp = time;
              group.data.date = dateStr; // Ganti dengan tanggal terbaru
            }
          }
        });
      });

      // Tentukan status akhir & rapikan
      const result = Array.from(groups.values()).map((g) => {
        let status = "Belum PO";
        if (g.hasAnyArrival) status = "Datang";
        else if (g.hasAnyPO) status = "Sudah PO";

        return { ...g.data, status };
      });

      // Urutkan berdasarkan tanggal terbaru
      return result.sort((a, b) => {
        const dateA = a.date !== "-" ? new Date(a.date).getTime() : 0;
        const dateB = b.date !== "-" ? new Date(b.date).getTime() : 0;
        if (dateA === dateB) return a.sortNumber - b.sortNumber;
        return dateB - dateA;
      });
    },
  });

  return { data: data ?? [], isLoading, error: error as Error | null, refetch };
};