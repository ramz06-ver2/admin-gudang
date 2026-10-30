// src/features/spb/suratJalanRules.ts
//
// Aturan bisnis Monitoring SPB yang dipakai BERSAMA oleh:
//   - useMonitoringSPB        (daftar card)
//   - useMonitoringSPBDetail  (isi tabel saat card dibuka)
// Dengan satu sumber aturan, jumlah barang di card selalu sama dengan jumlah
// baris di halaman detail.

/** Surat Jalan yang diabaikan sepenuhnya (data lama). Yang diproses: no 3 dan seterusnya. */
export const IGNORED_SURAT_JALAN: readonly string[] = ["1", "2"];

export const isIgnoredSuratJalan = (no: unknown): boolean =>
  IGNORED_SURAT_JALAN.includes(String(no ?? "").trim());

/** true jika nilai kolom (mis. id_spb / id_po) benar-benar terisi. */
export const hasValue = (val: unknown): boolean =>
  val !== null && val !== undefined && String(val).trim() !== "";

/**
 * Normalisasi nomor dokumen (no_spb / no_po) dari DB.
 * String kosong, "-", "null", "undefined" dianggap TIDAK ADA nomor -> null.
 */
export const cleanDocNo = (val: unknown): string | null => {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  const lower = s.toLowerCase();
  if (s === "" || s === "-" || lower === "null" || lower === "undefined") return null;
  return s;
};

export type SjTarget = "spb" | "po" | "sj";

/**
 * Menentukan di card mana sebuah baris Surat Jalan ditampilkan:
 *  - punya id_spb                -> card SPB
 *  - tanpa id_spb, punya id_po   -> card PO
 *  - tanpa id_spb dan id_po      -> card Surat Jalan
 */
export const getSjTarget = (sj: { id_spb?: unknown; id_po?: unknown }): SjTarget => {
  if (hasValue(sj.id_spb)) return "spb";
  if (hasValue(sj.id_po)) return "po";
  return "sj";
};