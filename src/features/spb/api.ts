// src/features/spb/api.ts
import { supabaseClient } from "../../shared/lib/supabaseClient";
import { TABLES } from "../../shared/lib/constants";
import { requirePermission } from "../../shared/lib/authGuard";
import type { SPBItemDetail } from "../../shared/types";
import { canViewRestrictedSpb, filterVisibleSpbRows, isRestrictedSpbStatus } from "./accessRules";
import { cleanDocNo, hasValue, isIgnoredSuratJalan } from "./suratJalanRules";
import type { MonitoringDetailItem } from "./types";
import {
  mapPoRow,
  mapSinglePoItem,
  mapSingleSjItem,
  mapSingleSpbItem,
  mapSjRow,
  mapSpbRow,
  sortById,
  unique,
  unwrap,
  type Row,
} from "./utils/mapDetailRows";
import {
  buildPoOverrideKey,
  buildSpbOverrideKey,
  saveTitleOverride,
} from "./utils/titleOverrides";

const PAGE_SIZE = 1000;

const SPB_SELECT = `*, po:po!id_po (no_po, tanggal_po, source_file)`;
const SJ_SELECT = `*, spb:spb!id_spb (no_spb, judul_spb, source_file, qty_permintaan), po:po!id_po (no_po, source_file)`;

export const fetchAllRows = async (
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

export const fetchMonitoringRawData = async () => {
  const [allSpbData, poData, sjData] = await Promise.all([
    fetchAllRows(
      "spb",
      `id, no_spb, judul_spb, tgl_spb, material_datang_tgl, id_po,
       qty_permintaan, material_datang_qty, nama_barang_spb, status,
       source_file,
       po:po!id_po (no_po, tanggal_po)`,
    ),
    fetchAllRows(
      "po",
      `id, no_po, judul_po, tanggal_po, id_spb, material_datang_tgl,
       material_datang_qty, nama_barang_po, nama_supplier, source_file`,
    ),
    fetchAllRows(
      "surat_jalan",
      `id, no_surat_jalan, id_spb, id_po, nama_barang,
       material_datang_tgl, material_datang_qty,
       spb:spb!id_spb (no_spb, judul_spb),
       po:po!id_po (no_po)`,
    ),
  ]);

  return { allSpbData, poData, sjData };
};

export const updateDocumentTitle = async (
  type: "spb" | "po",
  docNo: string,
  newTitle: string,
  originalTitle?: string | null,
): Promise<void> => {
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

/**
 * Validasi ketat baris SPB agar di card/detail Monitoring SPB hanya muncul data
 * dari tabel `spb` dengan `no_spb` dan `judul_spb` yang sesuai:
 * - Jika ada data dari nomor SPB lain (meskipun judulnya sama) -> lempar Error.
 * - Jika nomor SPB sama tetapi judulnya berbeda (baik antar-baris di DB maupun terhadap judul yang diminta) -> lempar Error.
 */
export const validateStrictSpbRows = (
  rows: Row[],
  spbNo: string,
  judulSpb: string | null = null,
): void => {
  const expectedNo = cleanDocNo(spbNo);
  const expectedTitle = cleanDocNo(judulSpb);

  for (const row of rows) {
    if (row.sumber && row.sumber !== "spb") {
      throw new Error(
        `Data tidak konsisten: Ditemukan data bukan dari tabel SPB (sumber: ${row.sumber}) pada SPB ${spbNo}.`,
      );
    }

    const rowNo = cleanDocNo(row.no_spb);
    const rowTitle = cleanDocNo(row.judul_spb);

    // 1. Jika data berasal dari nomor SPB lain (termasuk yang judulnya sama)
    if (rowNo !== expectedNo) {
      if (expectedTitle && rowTitle === expectedTitle) {
        throw new Error(
          `Data tidak konsisten: Ditemukan data dari nomor SPB lain (${row.no_spb ?? "-"}) dengan judul yang sama ("${row.judul_spb ?? judulSpb}").`,
        );
      }
      throw new Error(
        `Data tidak konsisten: Ditemukan data dari nomor SPB lain (${row.no_spb ?? "-"}) pada SPB ${spbNo}.`,
      );
    }
  }

  // 2. Jika nomor SPB sama tetapi memiliki lebih dari satu judul berbeda di database
  const uniqueTitles = new Set(rows.map((r) => cleanDocNo(r.judul_spb)));
  if (uniqueTitles.size > 1) {
    throw new Error(
      `Data tidak konsisten: SPB ${spbNo} memiliki lebih dari satu judul yang berbeda di database (${Array.from(uniqueTitles).join(", ")}). Mohon periksa kembali data SPB.`,
    );
  }

  // 3. Jika nomor SPB sama tetapi judul di database berbeda dengan judul yang diminta
  if (expectedTitle && rows.length > 0) {
    for (const row of rows) {
      const rowTitle = cleanDocNo(row.judul_spb);
      if (rowTitle !== expectedTitle) {
        throw new Error(
          `Data tidak konsisten: Nomor SPB ${spbNo} memiliki judul "${row.judul_spb ?? "-"}" yang berbeda dengan judul yang diminta ("${judulSpb}").`,
        );
      }
    }
  }
};

/**
 * Mengambil daftar barang detail berdasarkan nomor SPB dengan validasi STRICT.
 * Hanya mengembalikan baris dari tabel `spb` dengan `no_spb` dan `judul_spb` yang cocok.
 */
export const fetchDetailBySpb = async (
  spbNo: string,
  judulSpb: string | null = null,
  canViewRestricted = false,
): Promise<MonitoringDetailItem[]> => {
  // 1. Ambil semua baris dengan no_spb tersebut dari tabel spb
  const spbQuery = supabaseClient
    .from("spb")
    .select(SPB_SELECT)
    .eq("no_spb", spbNo);

  const allSpbRows = sortById(unwrap(await spbQuery));

  // 2. Validasi STRICT: pastikan nomor SPB dan judul konsisten
  validateStrictSpbRows(allSpbRows, spbNo, judulSpb);

  // 3. Filter berdasarkan judul yang diminta (jika ada)
  const spbRows = allSpbRows.filter((r) => {
    if (!judulSpb) return true;
    return cleanDocNo(r.judul_spb) === cleanDocNo(judulSpb);
  });

  const filteredSpbRows = filterVisibleSpbRows(spbRows, canViewRestricted);
  if (filteredSpbRows.length === 0) return [];

  const spbIds = filteredSpbRows.map((r) => r.id);

  const poRes = await supabaseClient
    .from("po")
    .select("id, no_po, tanggal_po, id_spb, source_file")
    .in("id_spb", spbIds);

  const poBySpbId = new Map<string, Row>();
  unwrap(poRes).forEach((p) => {
    const key = String(p.id_spb);
    if (cleanDocNo(p.no_po) && !poBySpbId.has(key)) poBySpbId.set(key, p);
  });

  return filteredSpbRows.map((r) =>
    mapSpbRow(r, poBySpbId.get(String(r.id)) ?? null),
  );
};

/**
 * Mengambil daftar barang detail berdasarkan nomor PO.
 */
export const fetchDetailByPo = async (
  poNo: string,
): Promise<MonitoringDetailItem[]> => {
  const poRows = sortById(
    unwrap(await supabaseClient.from("po").select("*").eq("no_po", poNo)),
  );
  if (poRows.length === 0) return [];

  const poIds = poRows.map((p) => p.id);
  const parentSpbIds = unique(poRows.map((p) => p.id_spb).filter(hasValue));

  const [parentSpbRes, spbPointingRes, sjRes] = await Promise.all([
    parentSpbIds.length > 0
      ? supabaseClient.from("spb").select("id").in("id", parentSpbIds)
      : Promise.resolve({ data: [], error: null }),
    supabaseClient.from("spb").select("id, id_po").in("id_po", poIds),
    supabaseClient
      .from("surat_jalan")
      .select(SJ_SELECT)
      .in("id_po", poIds)
      .is("id_spb", null),
  ]);

  const existingParentSpb = new Set(
    unwrap(parentSpbRes).map((s) => String(s.id)),
  );
  const poIdsUsedBySpb = new Set(
    unwrap(spbPointingRes).map((s) => String(s.id_po)),
  );

  const isLinkedToSpb = (p: Row) =>
    (hasValue(p.id_spb) && existingParentSpb.has(String(p.id_spb))) ||
    poIdsUsedBySpb.has(String(p.id));

  const poItems = poRows.filter((p) => !isLinkedToSpb(p)).map(mapPoRow);
  const sjItems = sortById(unwrap(sjRes))
    .filter((sj) => !isIgnoredSuratJalan(sj.no_surat_jalan))
    .map(mapSjRow);

  return [...poItems, ...sjItems];
};

/**
 * Mengambil daftar barang detail berdasarkan nomor Surat Jalan murni.
 */
export const fetchDetailBySuratJalan = async (
  sjNo: string,
): Promise<MonitoringDetailItem[]> => {
  if (isIgnoredSuratJalan(sjNo)) return [];

  const rows = unwrap(
    await supabaseClient
      .from("surat_jalan")
      .select(SJ_SELECT)
      .eq("no_surat_jalan", sjNo)
      .is("id_spb", null)
      .is("id_po", null),
  );

  return sortById(rows).map(mapSjRow);
};

/**
 * Mengambil rincian satu barang berdasarkan ID dan tipe sumber ("spb" | "po" | "sj").
 */
export const fetchSingleItemById = async (
  id: string,
  type: string,
): Promise<SPBItemDetail | null> => {
  if (type === "po") {
    const { data, error } = await supabaseClient
      .from("po")
      .select(`*, spb:spb!id_spb (qty_permintaan)`)
      .eq("id", id)
      .single();
    if (error) throw error;
    if (!data) return null;
    return mapSinglePoItem(data);
  }

  if (type === "sj") {
    const { data, error } = await supabaseClient
      .from("surat_jalan")
      .select(
        `*, spb:spb!id_spb (no_spb, tgl_spb, source_file, qty_permintaan), po:po!id_po (no_po, tanggal_po, nama_supplier, source_file)`,
      )
      .eq("id", id)
      .single();
    if (error) throw error;
    if (!data) return null;
    return mapSingleSjItem(data);
  }

  const { data, error } = await supabaseClient
    .from(TABLES.spb)
    .select(`*, po (no_po, tanggal_po, nama_supplier, source_file)`)
    .eq("id", id)
    .single();

  if (error) throw error;
  if (!data) return null;

  if (isRestrictedSpbStatus(data.status) && !canViewRestrictedSpb()) {
    return null;
  }

  let dataPo = Array.isArray(data.po) ? data.po[0] : data.po;

  if (!dataPo && data.id) {
    try {
      const fallbackRes = await supabaseClient
        .from("po")
        .select("no_po, tanggal_po, nama_supplier, source_file")
        .eq("id_spb", data.id)
        .single();
      if (fallbackRes?.data) {
        dataPo = fallbackRes.data;
      }
    } catch {
      // ignore fallback error
    }
  }

  return mapSingleSpbItem(data, dataPo);
};