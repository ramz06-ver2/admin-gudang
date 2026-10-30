import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../../shared/lib/supabaseClient";
import { USE_MOCK } from "../../shared/lib/config";
import type { SPBDocumentGroup } from "../../shared/types";
import { cleanDocNo, getSjTarget, isIgnoredSuratJalan } from "./suratJalanRules";

const TITLE_OVERRIDES_KEY = "spb-po-title-overrides";

export const getTitleOverrides = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(TITLE_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveTitleOverride = (key: string, title: string) => {
  try {
    const current = getTitleOverrides();
    current[key] = title;
    localStorage.setItem(TITLE_OVERRIDES_KEY, JSON.stringify(current));
  } catch {
    // ignore storage errors
  }
};

export const updateDocumentTitle = async (
  type: "spb" | "po",
  docNo: string,
  newTitle: string,
) => {
  const trimmed = newTitle.trim();
  const overrideKey = `${type.toUpperCase()}_${docNo}`;
  saveTitleOverride(overrideKey, trimmed);

  if (type === "spb") {
    const { error } = await supabaseClient
      .from("spb")
      .update({ judul_spb: trimmed })
      .eq("no_spb", docNo);
    if (error) throw error;
  } else {
    const { error } = await supabaseClient
      .from("po")
      .update({ judul_po: trimmed })
      .eq("no_po", docNo);
    if (error) throw error;
  }
};

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

      const overrides = getTitleOverrides();

      const [spbRes, poRes, sjRes] = await Promise.all([
        supabaseClient.from("spb").select(`
          id, no_spb, judul_spb, tgl_spb, material_datang_tgl, id_po,
          qty_permintaan, material_datang_qty, nama_barang_spb,
          po:po!id_po (no_po, tanggal_po)
        `),
        supabaseClient.from("po").select(`
          id, no_po, tanggal_po, id_spb, material_datang_tgl, material_datang_qty, nama_barang_po
        `),
        supabaseClient.from("surat_jalan").select(`
          id, no_surat_jalan, id_spb, id_po, nama_barang, 
          material_datang_tgl, material_datang_qty,
          spb:spb!id_spb (no_spb, judul_spb),
          po:po!id_po (no_po)
        `),
      ]);

      if (spbRes.error) throw spbRes.error;
      if (poRes.error) throw poRes.error;
      if (sjRes.error) throw sjRes.error;

      const spbData = spbRes.data || [];
      const poData = poRes.data || [];
      const sjData = sjRes.data || [];

      const poBySpbId = new Map<string, any[]>();
      poData.forEach((p: any) => {
        if (p.id_spb) {
          const key = String(p.id_spb);
          if (!poBySpbId.has(key)) poBySpbId.set(key, []);
          poBySpbId.get(key)!.push(p);
        }
      });

      const groups = new Map<
        string,
        {
          data: SPBDocumentGroup;
          hasAnyPO: boolean;
          hasAnyArrival: boolean;
          latestTimestamp: number;
          poSet: Set<string>;
          completedItems: number;
          itemNames: Set<string>;
        }
      >();

      const updateLatestDate = (group: any, dateStr: string | null) => {
        if (!dateStr) return;
        const time = new Date(dateStr).getTime();
        if (!isNaN(time) && time > group.latestTimestamp) {
          group.latestTimestamp = time;
          group.data.date = dateStr;
        }
      };

      // PROSES 1: Kelompokkan berdasarkan SPB
      spbData.forEach((row: any) => {
        const spbNo = toStrOrNull(row.no_spb);
        const key = spbNo || `SPB_${row.id}`;
        const spbOverride = spbNo ? overrides[`SPB_${spbNo}`] : undefined;

        if (!groups.has(key)) {
          groups.set(key, {
            data: {
              id: key,
              spbNo,
              spbTitle: spbOverride !== undefined ? spbOverride : (row.judul_spb || null),
              poNo: null,
              poTitle: null,
              date: "-",
              itemsCount: 0,
              sortNumber: getSortNumber(spbNo),
              status: "Belum PO",
            },
            hasAnyPO: false,
            hasAnyArrival: false,
            latestTimestamp: 0,
            poSet: new Set<string>(),
            completedItems: 0,
            itemNames: new Set<string>(),
          });
        }

        const group = groups.get(key)!;
        if (!group.data.spbTitle && row.judul_spb) {
          group.data.spbTitle = spbOverride !== undefined ? spbOverride : row.judul_spb;
        }
        group.data.itemsCount += 1;

        const itemName = toStrOrNull(row.nama_barang_spb);
        if (itemName) group.itemNames.add(itemName);

        updateLatestDate(group, row.tgl_spb);

        const req = row.qty_permintaan || 0;
        const arr = row.material_datang_qty || 0;
        const isArrived = !!row.material_datang_tgl;

        if (isArrived) {
          group.hasAnyArrival = true;
          updateLatestDate(group, row.material_datang_tgl);
          if (arr >= req) group.completedItems += 1;
        }

        const joinedPo = Array.isArray(row.po) ? row.po[0] : row.po;
        if (joinedPo && cleanDocNo(joinedPo.no_po)) {
          group.poSet.add(String(cleanDocNo(joinedPo.no_po)));
          group.hasAnyPO = true;
          updateLatestDate(group, joinedPo.tanggal_po);
        }

        const linkedPos = poBySpbId.get(String(row.id)) || [];
        linkedPos.forEach((p: any) => {
          if (cleanDocNo(p.no_po)) {
            group.poSet.add(String(cleanDocNo(p.no_po)));
            group.hasAnyPO = true;
            updateLatestDate(group, p.tanggal_po);
          }
        });
      });

      // PROSES 2: Cari PO yang TIDAK punya SPB
      const existingSpbIds = new Set(spbData.map((s: any) => String(s.id)));

      poData.forEach((p: any) => {
        const isLinked =
          (p.id_spb && existingSpbIds.has(String(p.id_spb))) ||
          spbData.some((s: any) => s.id_po === p.id);

        if (!isLinked) {
          const poNo = cleanDocNo(p.no_po);
          const key = poNo ? `PO_${poNo}` : `PO_ID_${p.id}`;
          const poOverride = poNo ? overrides[`PO_${poNo}`] : undefined;

          if (!groups.has(key)) {
            groups.set(key, {
              data: {
                id: key,
                spbNo: null,
                spbTitle: null,
                poNo: poNo,
                poTitle: poOverride !== undefined ? poOverride : (p.judul_po || null),
                date: p.tanggal_po || "-",
                itemsCount: 0,
                sortNumber: getSortNumber(poNo),
                status: "Sudah PO",
              },
              hasAnyPO: true,
              hasAnyArrival: false,
              latestTimestamp: 0,
              poSet: new Set([poNo || ""]),
              completedItems: 0,
              itemNames: new Set<string>(),
            });
          }

          const group = groups.get(key)!;
          if (!group.data.poTitle && p.judul_po) {
            group.data.poTitle = poOverride !== undefined ? poOverride : p.judul_po;
          }
          group.data.itemsCount += 1;

          const itemName = toStrOrNull(p.nama_barang_po);
          if (itemName) group.itemNames.add(itemName);

          updateLatestDate(group, p.tanggal_po);

          if (p.material_datang_tgl) {
            group.hasAnyArrival = true;
            updateLatestDate(group, p.material_datang_tgl);
            if ((p.material_datang_qty || 0) > 0) group.completedItems += 1;
          }
        }
      });

      // PROSES 3: Kelompokkan data dari Surat Jalan (no 3 dan seterusnya)
      sjData.forEach((sj: any) => {
        if (isIgnoredSuratJalan(sj.no_surat_jalan)) return;

        const spbRel = Array.isArray(sj.spb) ? sj.spb[0] : sj.spb;
        const poRel = Array.isArray(sj.po) ? sj.po[0] : sj.po;
        const sjNo = toStrOrNull(sj.no_surat_jalan);
        const target = getSjTarget(sj);

        let targetKey: string;
        let spbNo: string | null = null;
        let spbTitle: string | null = null;
        let poNo: string | null = null;

        if (target === "spb") {
          spbNo = cleanDocNo(spbRel?.no_spb);
          spbTitle = toStrOrNull(spbRel?.judul_spb);
          targetKey = spbNo ? spbNo : `SPB_${sj.id_spb}`;
        } else if (target === "po") {
          poNo = cleanDocNo(poRel?.no_po);
          targetKey = poNo ? `PO_${poNo}` : `PO_ID_${sj.id_po}`;
        } else {
          targetKey = `SJ_${sjNo}`;
        }

        if (!groups.has(targetKey)) {
          groups.set(targetKey, {
            data: {
              id: targetKey,
              spbNo,
              spbTitle,
              poNo,
              poTitle: poNo ? (overrides[`PO_${poNo}`] ?? null) : null,
              suratJalanNo: target === "sj" ? sjNo : null,
              date: "-",
              itemsCount: 0,
              sortNumber: getSortNumber(spbNo ?? poNo ?? sjNo),
              status: "Sudah PO",
            },
            hasAnyPO: true,
            hasAnyArrival: false,
            latestTimestamp: 0,
            poSet: new Set<string>(poNo ? [poNo] : []),
            completedItems: 0,
            itemNames: new Set<string>(),
          });
        }

        const group = groups.get(targetKey)!;
        group.data.itemsCount += 1;

        if (sj.nama_barang) group.itemNames.add(sj.nama_barang);

        if (sj.material_datang_tgl) {
          group.hasAnyArrival = true;
          updateLatestDate(group, sj.material_datang_tgl);
          if ((sj.material_datang_qty || 0) > 0) group.completedItems += 1;
        }
      });

      // Finalisasi Status & Sorting
      const result = Array.from(groups.values()).map((g) => {
        const isSelesai = g.data.itemsCount > 0 && g.completedItems >= g.data.itemsCount;
        let status = "Belum PO";
        if (isSelesai) status = "Selesai";
        else if (g.hasAnyArrival) status = "Datang";
        else if (g.hasAnyPO) status = "Sudah PO";

        const combinedPo = Array.from(g.poSet).filter(Boolean).join(", ");
        const firstPo = Array.from(g.poSet).filter(Boolean)[0];
        const poTitle =
          g.data.poTitle ??
          (firstPo && overrides[`PO_${firstPo}`] !== undefined
            ? overrides[`PO_${firstPo}`]
            : null);

        return {
          ...g.data,
          poNo: combinedPo || null,
          poTitle,
          status,
          sortNumber: getSortNumber(g.data.spbNo) + getSortNumber(combinedPo) * 0.01,
          itemNames: Array.from(g.itemNames),
        };
      });

      // ✅ URUTAN: Sudah PO & Belum PO (1) -> Datang (2) -> Selesai (3)
      const getStatusWeight = (status: string) => {
        if (status === "Sudah PO") return 1;
        if (status === "Belum PO") return 1;
        if (status === "Datang") return 2;
        if (status === "Selesai") return 3;
        return 4;
      };

      return result.sort((a, b) => {
        const weightA = getStatusWeight(a.status || "");
        const weightB = getStatusWeight(b.status || "");
        if (weightA !== weightB) return weightA - weightB;

        const dateA = a.date !== "-" ? new Date(a.date).getTime() : 0;
        const dateB = b.date !== "-" ? new Date(b.date).getTime() : 0;
        if (dateA === dateB) return a.sortNumber - b.sortNumber;
        return dateB - dateA;
      });
    },
  });

  return { data: data ?? [], isLoading, error: error as Error | null, refetch };
};
