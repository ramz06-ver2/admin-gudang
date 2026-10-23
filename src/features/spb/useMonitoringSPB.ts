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

      // 1. Tarik semua SPB (beserta relasi PO-nya jika ada)
      const spbPromise = supabaseClient
        .from("spb")
        .select(`
          id,
          no_spb,
          tgl_spb,
          material_datang_tgl,
          id_po,
          po:po!id_po (
            no_po,
            tanggal_po
          )
        `);

      // 2. Tarik SEMUA PO (untuk mencari PO yang tidak punya SPB)
      const poPromise = supabaseClient
        .from("po")
        .select(`
          id,
          no_po,
          tanggal_po,
          id_spb,
          material_datang_tgl
        `);

      const [spbRes, poRes] = await Promise.all([spbPromise, poPromise]);
      if (spbRes.error) throw spbRes.error;
      if (poRes.error) throw poRes.error;

      const spbData = spbRes.data || [];
      const poData = poRes.data || [];

      const groups = new Map<string, { 
        data: SPBDocumentGroup; 
        hasAnyPO: boolean; 
        hasAnyArrival: boolean;
        latestTimestamp: number;
        poSet: Set<string>;
      }>();

      // ==========================================
      // PROSES 1: Kelompokkan berdasarkan SPB
      // ==========================================
      spbData.forEach((row: any) => {
        const spbNo = toStrOrNull(row.no_spb);
        const key = spbNo || `SPB_${row.id}`;
        
        if (!groups.has(key)) {
          groups.set(key, {
            data: {
              id: key,
              spbNo,
              poNo: null,
              date: "-",
              itemsCount: 0,
              sortNumber: getSortNumber(spbNo),
              status: "Belum PO"
            },
            hasAnyPO: false,
            hasAnyArrival: false,
            latestTimestamp: 0,
            poSet: new Set<string>()
          });
        }

        const group = groups.get(key)!;
        group.data.itemsCount += 1;

        // Cek Tanggal SPB & Datang
        if (row.tgl_spb) {
          const time = new Date(row.tgl_spb).getTime();
          if (!isNaN(time) && time > group.latestTimestamp) {
            group.latestTimestamp = time;
            group.data.date = row.tgl_spb;
          }
        }
        if (row.material_datang_tgl) {
          group.hasAnyArrival = true;
          const time = new Date(row.material_datang_tgl).getTime();
          if (!isNaN(time) && time > group.latestTimestamp) {
            group.latestTimestamp = time;
            group.data.date = row.material_datang_tgl;
          }
        }

        // Cek Relasi PO (dari join)
        const joinedPo = Array.isArray(row.po) ? row.po[0] : row.po;
        if (joinedPo && joinedPo.no_po) {
          group.poSet.add(joinedPo.no_po);
          group.hasAnyPO = true;
          if (joinedPo.tanggal_po) {
            const time = new Date(joinedPo.tanggal_po).getTime();
            if (!isNaN(time) && time > group.latestTimestamp) {
              group.latestTimestamp = time;
              group.data.date = joinedPo.tanggal_po;
            }
          }
        }

        // Cek Relasi PO (dari po.id_spb)
        const linkedPos = poData.filter((p: any) => String(p.id_spb) === String(row.id));
        linkedPos.forEach((p: any) => {
          if (p.no_po) {
            group.poSet.add(p.no_po);
            group.hasAnyPO = true;
            if (p.tanggal_po) {
              const time = new Date(p.tanggal_po).getTime();
              if (!isNaN(time) && time > group.latestTimestamp) {
                group.latestTimestamp = time;
                group.data.date = p.tanggal_po;
              }
            }
          }
        });
      });

      // ==========================================
      // PROSES 2: Cari PO yang TIDAK punya SPB
      // ==========================================
      const existingSpbIds = new Set(spbData.map((s: any) => String(s.id)));
      
      poData.forEach((p: any) => {
        // Apakah PO ini menempel ke SPB?
        const isLinkedToSpb = 
          (p.id_spb && existingSpbIds.has(String(p.id_spb))) ||
          (spbData.some((s: any) => s.id_po === p.id));
          
        if (!isLinkedToSpb) {
          // Ini adalah PO tanpa SPB, buatkan Card tersendiri
          const poNo = toStrOrNull(p.no_po);
          const key = `PO_${p.id}`;
          
          if (!groups.has(key)) {
            groups.set(key, {
              data: {
                id: key,
                spbNo: null, // Karena tidak punya SPB
                poNo: poNo,
                date: p.tanggal_po || "-",
                itemsCount: 1,
                sortNumber: getSortNumber(poNo),
                status: "Sudah PO"
              },
              hasAnyPO: true,
              hasAnyArrival: !!p.material_datang_tgl,
              latestTimestamp: 0,
              poSet: new Set([poNo || ""])
            });
            
            const group = groups.get(key)!;
            
            if (p.tanggal_po) {
              const time = new Date(p.tanggal_po).getTime();
              if (!isNaN(time) && time > group.latestTimestamp) {
                group.latestTimestamp = time;
                group.data.date = p.tanggal_po;
              }
            }
            if (p.material_datang_tgl) {
              const time = new Date(p.material_datang_tgl).getTime();
              if (!isNaN(time) && time > group.latestTimestamp) {
                group.latestTimestamp = time;
                group.data.date = p.material_datang_tgl;
              }
            }
          }
        }
      });

      // Finalisasi status
      const result = Array.from(groups.values()).map((g) => {
        let status = "Belum PO";
        if (g.hasAnyArrival) status = "Datang";
        else if (g.hasAnyPO) status = "Sudah PO";

        const combinedPo = Array.from(g.poSet).join(", ");

        return { 
          ...g.data, 
          poNo: combinedPo || null,
          status,
          sortNumber: getSortNumber(g.data.spbNo) + getSortNumber(combinedPo) * 0.01
        };
      });

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