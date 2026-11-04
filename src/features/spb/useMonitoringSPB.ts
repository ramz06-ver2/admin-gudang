// src/features/spb/useMonitoringSPB.ts
import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../../shared/lib/supabaseClient";
import { USE_MOCK } from "../../shared/lib/config";
import { requirePermission } from "../../shared/lib/authGuard";
import type { SPBDocumentGroup } from "../../shared/types";
import {
  cleanDocNo,
  getSjTarget,
  isIgnoredSuratJalan,
  toIdNumber,
} from "./suratJalanRules";

const TITLE_OVERRIDES_KEY = "spb-po-title-overrides";

// PostgREST (Supabase) default max-rows = 1000.
// Semua tabel master wajib dibaca dengan pagination agar tidak silently
// terpotong (ini yang membuat SPB id 635 "hilang" dan PO 69 jadi orphan).
const PAGE_SIZE = 1000;

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

const buildSpbOverrideKey = (docNo: string, originalTitle?: string | null) =>
  `SPB_${docNo}::${originalTitle ?? ""}`;

const buildPoOverrideKey = (docNo: string) => `PO_${docNo}`;

export const updateDocumentTitle = async (
  type: "spb" | "po",
  docNo: string,
  newTitle: string,
  originalTitle?: string | null,
) => {
  // 🔒 Verifikasi: user harus login dan punya izin edit_data
  requirePermission("edit_data", `Edit judul ${type.toUpperCase()}`);
  const trimmed = newTitle.trim();

  if (type === "spb") {
    saveTitleOverride(buildSpbOverrideKey(docNo, originalTitle), trimmed);
    let q = supabaseClient
      .from("spb")
      .update({ judul_spb: trimmed })
      .eq("no_spb", docNo);
    if (originalTitle) q = q.eq("judul_spb", originalTitle);
    const { error } = await q;
    if (error) throw error;
  } else {
    saveTitleOverride(buildPoOverrideKey(docNo), trimmed);
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
  const s = String(val).trim();
  if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") {
    return null;
  }
  return s;
};

/**
 * Ambil SEMUA baris dari sebuah tabel. Karena PostgREST membatasi maksimal
 * 1000 baris per request, kita loop dengan `.range()` sampai halaman terakhir.
 *
 * Guard iterasi (100 halaman = 100.000 baris) untuk mencegah infinite loop
 * jika terjadi anomali.
 */
const fetchAllRows = async (
  table: string,
  select: string,
): Promise<any[]> => {
  const all: any[] = [];
  let from = 0;

  for (let guard = 0; guard < 100; guard += 1) {
    const { data, error } = await supabaseClient
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    const rows = (data as any[]) ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;

    from += PAGE_SIZE;
  }

  return all;
};

const buildSpbGroupKey = (
  spbNo: string | null,
  spbTitle: string | null,
  fallbackId: unknown,
) =>
  spbNo
    ? `SPB_${spbNo}::${spbTitle ?? ""}`
    : `SPB_ID_${fallbackId ?? "UNKNOWN"}`;

/**
 * Judul fallback untuk PO. Tidak memaksa `judul_po` di DB menjadi NOT NULL —
 * cukup tampilkan info paling berguna yang tersedia.
 *
 * Urutan prioritas:
 *   1. Override manual dari user (localStorage)
 *   2. Kolom judul_po dari DB
 *   3. Judul SPB pasangannya (jika PO ini menempel ke SPB)
 *   4. Nama barang pertama di PO ini
 *   5. "PO {no_po}" sebagai penutup
 *
 * Hasilnya: card PO tidak pernah kosong walau judul_po NULL di DB.
 */
const resolvePoTitle = (
  poNo: string | null,
  rawPoTitle: string | null,
  overrideValue: string | undefined,
  spbTitle: string | null,
  firstItemName: string | null,
): string | null => {
  if (overrideValue !== undefined) return overrideValue;
  if (rawPoTitle) return rawPoTitle;
  if (spbTitle) return spbTitle;
  if (firstItemName) return firstItemName;
  if (poNo) return `PO ${poNo}`;
  return null;
};

export const useMonitoringSPB = () => {
  const { data, isLoading, error, refetch } = useQuery<SPBDocumentGroup[]>({
    queryKey: ["monitoring-spb"],
    queryFn: async () => {
      if (USE_MOCK) return [];

      const overrides = getTitleOverrides();

      // ===== 1. Ambil SEMUA data (pagination anti-limit-1000) =====
      const [spbData, poData, sjData] = await Promise.all([
        fetchAllRows(
          "spb",
          `id, no_spb, judul_spb, tgl_spb, material_datang_tgl, id_po,
           qty_permintaan, material_datang_qty, nama_barang_spb, status,
           po:po!id_po (no_po, tanggal_po)`,
        ),
        fetchAllRows(
          "po",
          `id, no_po, judul_po, tanggal_po, id_spb, material_datang_tgl,
           material_datang_qty, nama_barang_po, nama_supplier`,
        ),
        fetchAllRows(
          "surat_jalan",
          `id, no_surat_jalan, id_spb, id_po, nama_barang,
           material_datang_tgl, material_datang_qty,
           spb:spb!id_spb (no_spb, judul_spb),
           po:po!id_po (no_po)`,
        ),
      ]);

      // ===== 2. Normalisasi judul SPB per no_spb =====
      // Jika satu baris SPB 52 judul_spb-nya NULL, ambil judul dominan dari
      // baris lain dengan no_spb sama. Ini mencegah group SPB pecah karena
      // judul yang tidak konsisten antar baris.
      const titleBySpbNo = new Map<string, string>();
      spbData.forEach((row: any) => {
        const no = toStrOrNull(row.no_spb);
        const t = toStrOrNull(row.judul_spb);
        if (no && t && !titleBySpbNo.has(no)) titleBySpbNo.set(no, t);
      });

      // ===== 3. Index id SPB (number-keyed) =====
      const spbById = new Map<number, any>();
      spbData.forEach((s: any) => {
        const id = toIdNumber(s.id);
        if (id !== null) spbById.set(id, s);
      });

      // Index id SPB -> daftar PO yang menunjuk ke SPB tersebut.
      // Key number agar cocok dengan spbById di atas.
      const poBySpbId = new Map<number, any[]>();
      poData.forEach((p: any) => {
        const idSpb = toIdNumber(p.id_spb);
        if (idSpb !== null) {
          if (!poBySpbId.has(idSpb)) poBySpbId.set(idSpb, []);
          poBySpbId.get(idSpb)!.push(p);
        }
      });

      // ===== 4. Struktur internal group =====
      const groups = new Map<
        string,
        {
          data: SPBDocumentGroup;
          hasAnyPO: boolean;
          hasAnyArrival: boolean;
          hasAnyBelumDiproses: boolean;
          hasAnySudahDiproses: boolean;
          latestTimestamp: number;
          poSet: Set<string>;
          completedItems: number;
          itemNames: Set<string>;
          firstItemName: string | null;
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

      // ===== 5. Proses baris SPB =====
      spbData.forEach((row: any) => {
        const spbNo = toStrOrNull(row.no_spb);
        const rawTitle = toStrOrNull(row.judul_spb);
        // Fallback: pakai judul dominan per no_spb kalau baris ini NULL
        const spbTitleRaw =
          rawTitle ?? (spbNo ? titleBySpbNo.get(spbNo) ?? null : null);
        const key = buildSpbGroupKey(spbNo, spbTitleRaw, row.id);

        const overrideKey = spbNo
          ? buildSpbOverrideKey(spbNo, spbTitleRaw)
          : null;
        const spbOverride = overrideKey ? overrides[overrideKey] : undefined;

        if (!groups.has(key)) {
          groups.set(key, {
            data: {
              id: key,
              spbNo,
              spbTitle:
                spbOverride !== undefined ? spbOverride : spbTitleRaw || null,
              poNo: null,
              poTitle: null,
              date: "-",
              itemsCount: 0,
              sortNumber: getSortNumber(spbNo),
              status: "Belum PO",
            },
            hasAnyPO: false,
            hasAnyArrival: false,
            hasAnyBelumDiproses: false,
            hasAnySudahDiproses: false,
            latestTimestamp: 0,
            poSet: new Set<string>(),
            completedItems: 0,
            itemNames: new Set<string>(),
            firstItemName: null,
          });
        }

        const group = groups.get(key)!;
        if (!group.data.spbTitle && spbTitleRaw) {
          group.data.spbTitle =
            spbOverride !== undefined ? spbOverride : spbTitleRaw;
        }
        group.data.itemsCount += 1;

        const itemName = toStrOrNull(row.nama_barang_spb);
        if (itemName) {
          group.itemNames.add(itemName);
          if (!group.firstItemName) group.firstItemName = itemName;
        }

        updateLatestDate(group, row.tgl_spb);

        const rowStatus = toStrOrNull(row.status)?.toLowerCase() || "";
        if (rowStatus === "belum di proses") {
          group.hasAnyBelumDiproses = true;
        } else if (rowStatus === "sudah di proses") {
          group.hasAnySudahDiproses = true;
        }

        const req = row.qty_permintaan || 0;
        const arr = row.material_datang_qty || 0;
        const isArrived = !!row.material_datang_tgl;

        if (isArrived) {
          group.hasAnyArrival = true;
          updateLatestDate(group, row.material_datang_tgl);
          if (arr >= req) group.completedItems += 1;
        }

        // Link via SPB.po -> PO (joined rel)
        const joinedPo = Array.isArray(row.po) ? row.po[0] : row.po;
        if (joinedPo && cleanDocNo(joinedPo.no_po)) {
          group.poSet.add(String(cleanDocNo(joinedPo.no_po)));
          group.hasAnyPO = true;
          updateLatestDate(group, joinedPo.tanggal_po);
        }

        // Link via PO.id_spb -> SPB.id (number comparison)
        const spbIdNum = toIdNumber(row.id);
        const linkedPos =
          spbIdNum !== null ? poBySpbId.get(spbIdNum) || [] : [];
        linkedPos.forEach((p: any) => {
          if (cleanDocNo(p.no_po)) {
            group.poSet.add(String(cleanDocNo(p.no_po)));
            group.hasAnyPO = true;
            updateLatestDate(group, p.tanggal_po);
          }
        });
      });

      // ===== 6. Proses PO (baik yang ter-link SPB maupun orphan) =====
      poData.forEach((p: any) => {
        const idSpb = toIdNumber(p.id_spb);
        const poId = toIdNumber(p.id);

        // Ter-link jika id_spb menunjuk SPB yang benar-benar ada,
        // ATAU ada SPB yang id_po-nya sama dengan PO ini.
        const linkedViaIdSpb = idSpb !== null && spbById.has(idSpb);
        const linkedViaSpbIdPo =
          poId !== null &&
          spbData.some((s: any) => toIdNumber(s.id_po) === poId);

        if (linkedViaIdSpb || linkedViaSpbIdPo) return; // sudah masuk ke card SPB

        // PO murni (tanpa SPB) atau orphan (id_spb menunjuk SPB yang hilang).
        const poNo = cleanDocNo(p.no_po);
        const key = poNo ? `PO_${poNo}` : `PO_ID_${p.id}`;
        const poOverride = poNo
          ? overrides[buildPoOverrideKey(poNo)]
          : undefined;

        if (!groups.has(key)) {
          groups.set(key, {
            data: {
              id: key,
              spbNo: null,
              spbTitle: null,
              poNo,
              poTitle: null, // diisi di tahap finalisasi
              date: p.tanggal_po || "-",
              itemsCount: 0,
              sortNumber: getSortNumber(poNo),
              status: "Sudah PO",
            },
            hasAnyPO: true,
            hasAnyArrival: false,
            hasAnyBelumDiproses: false,
            hasAnySudahDiproses: true,
            latestTimestamp: 0,
            poSet: new Set([poNo || ""]),
            completedItems: 0,
            itemNames: new Set<string>(),
            firstItemName: null,
          });
        }

        const group = groups.get(key)!;
        // Simpan judul_po mentah (boleh NULL — fallback terjadi nanti)
        if (!group.data.poTitle) {
          const rawPoTitle = toStrOrNull(p.judul_po);
          if (rawPoTitle) group.data.poTitle = rawPoTitle;
        }
        group.data.itemsCount += 1;

        const itemName = toStrOrNull(p.nama_barang_po);
        if (itemName) {
          group.itemNames.add(itemName);
          if (!group.firstItemName) group.firstItemName = itemName;
        }

        updateLatestDate(group, p.tanggal_po);

        if (p.material_datang_tgl) {
          group.hasAnyArrival = true;
          updateLatestDate(group, p.material_datang_tgl);
          if ((p.material_datang_qty || 0) > 0) group.completedItems += 1;
        }
      });

      // ===== 7. Proses Surat Jalan (no 3+) =====
      sjData.forEach((sj: any) => {
        if (isIgnoredSuratJalan(sj.no_surat_jalan)) return;

        const spbRel = Array.isArray(sj.spb) ? sj.spb[0] : sj.spb;
        const poRel = Array.isArray(sj.po) ? sj.po[0] : sj.po;
        const sjNo = toStrOrNull(sj.no_surat_jalan);
        const target = getSjTarget(sj);

        const idSpb = toIdNumber(sj.id_spb);

        let targetKey: string;
        let spbNo: string | null = null;
        let spbTitle: string | null = null;
        let poNo: string | null = null;

        if (target === "spb") {
          // Cari SPB asli via id (bisa gagal jika SPB hilang)
          const parentSpb = idSpb !== null ? spbById.get(idSpb) : null;
          spbNo =
            cleanDocNo(parentSpb?.no_spb) ?? cleanDocNo(spbRel?.no_spb);
          const rawTitle =
            toStrOrNull(parentSpb?.judul_spb) ??
            toStrOrNull(spbRel?.judul_spb);
          spbTitle =
            rawTitle ?? (spbNo ? titleBySpbNo.get(spbNo) ?? null : null);
          targetKey = buildSpbGroupKey(spbNo, spbTitle, sj.id_spb);
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
              poTitle: poNo
                ? resolvePoTitle(
                    poNo,
                    null,
                    overrides[buildPoOverrideKey(poNo)],
                    null,
                    null,
                  )
                : null,
              suratJalanNo: target === "sj" ? sjNo : null,
              date: "-",
              itemsCount: 0,
              sortNumber: getSortNumber(spbNo ?? poNo ?? sjNo),
              status: "Sudah PO",
            },
            hasAnyPO: true,
            hasAnyArrival: false,
            hasAnyBelumDiproses: false,
            hasAnySudahDiproses: true,
            latestTimestamp: 0,
            poSet: new Set<string>(poNo ? [poNo] : []),
            completedItems: 0,
            itemNames: new Set<string>(),
            firstItemName: null,
          });
        }

        const group = groups.get(targetKey)!;
        group.data.itemsCount += 1;

        if (sj.nama_barang) {
          const sjName = String(sj.nama_barang);
          group.itemNames.add(sjName);
          if (!group.firstItemName) group.firstItemName = sjName;
        }

        if (sj.material_datang_tgl) {
          group.hasAnyArrival = true;
          updateLatestDate(group, sj.material_datang_tgl);
          if ((sj.material_datang_qty || 0) > 0) group.completedItems += 1;
        }
      });

      // ===== 8. Finalisasi status + judul PO fallback + sorting =====
      const result = Array.from(groups.values()).map((g) => {
        const isSelesai =
          g.data.itemsCount > 0 && g.completedItems >= g.data.itemsCount;

        let status = "Belum PO";
        if (isSelesai) status = "Selesai";
        else if (g.hasAnyArrival) status = "Datang";
        else if (g.hasAnyPO) status = "Sudah PO";
        else if (g.hasAnyBelumDiproses && !g.hasAnySudahDiproses) {
          status = "Belum Diproses";
        }

        const combinedPo = Array.from(g.poSet).filter(Boolean).join(", ");
        const firstPo = Array.from(g.poSet).filter(Boolean)[0];

        // 🔑 Ini kuncinya: PO boleh tidak punya judul_po & supplier di DB.
        // Kita tampilkan info fallback yang berguna, tanpa memaksa NOT NULL.
        const poTitle = g.data.poNo
          ? resolvePoTitle(
              firstPo ?? null,
              g.data.poTitle ?? null,
              firstPo && overrides[buildPoOverrideKey(firstPo)] !== undefined
                ? overrides[buildPoOverrideKey(firstPo)]
                : undefined,
              g.data.spbTitle ?? null,
              g.firstItemName,
            )
          : null;

        return {
          ...g.data,
          poNo: combinedPo || null,
          poTitle,
          status,
          sortNumber:
            getSortNumber(g.data.spbNo) + getSortNumber(combinedPo) * 0.01,
          itemNames: Array.from(g.itemNames),
        };
      });

      const getStatusWeight = (status: string) => {
        if (status === "Belum Diproses") return 0;
        if (status === "Sudah PO" || status === "Belum PO") return 1;
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

  return {
    data: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
};