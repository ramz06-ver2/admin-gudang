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

/** true jika nilai kolom (mis. no_spb / no_po / judul) benar-benar terisi. */
export const hasValue = (val: unknown): boolean =>
  val !== null && val !== undefined && String(val).trim() !== "";

/**
 * Normalisasi id FK (id_spb / id_po / id) menjadi number.
 *
 * Data id di DB sekarang bertipe number (bigint / integer). Namun untuk
 * keamanan terhadap sisa data lama yang mungkin masih string, helper ini
 * menyamakan keduanya menjadi number agar semua perbandingan konsisten.
 *
 * Nilai yang tidak valid, 0, atau negatif dianggap "tidak ada id".
 * (id 0 tidak dipakai di database, sehingga aman dijadikan sentinel null.)
 */
export const toIdNumber = (val: unknown): number | null => {
  if (val === null || val === undefined) return null;
  if (typeof val === "string" && val.trim() === "") return null;
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};

/**
 * Normalisasi nomor dokumen (no_spb / no_po) dari DB.
 * String kosong, "-", "null", "undefined" dianggap TIDAK ADA nomor -> null.
 */
export const cleanDocNo = (val: unknown): string | null => {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  const lower = s.toLowerCase();
  if (s === "" || s === "-" || lower === "null" || lower === "undefined") {
    return null;
  }
  return s;
};

export type SjTarget = "spb" | "po" | "sj";

/**
 * Menentukan di card mana sebuah baris Surat Jalan ditampilkan:
 *  - punya id_spb                -> card SPB
 *  - tanpa id_spb, punya id_po   -> card PO
 *  - tanpa id_spb dan id_po      -> card Surat Jalan
 *
 * Menggunakan `toIdNumber` agar "0", "0.0", " ", null semua dianggap kosong.
 */
export const getSjTarget = (sj: {
  id_spb?: unknown;
  id_po?: unknown;
}): SjTarget => {
  if (toIdNumber(sj.id_spb) !== null) return "spb";
  if (toIdNumber(sj.id_po) !== null) return "po";
  return "sj";
};

// ============================================================================
// FUNGSI TAMBAHAN UNTUK CHATBOT & UI MAPPING
// ============================================================================

/**
 * Membersihkan judul SPB dari teks "null", "undefined", atau tanda strip.
 */
export const cleanSpbTitle = (title: unknown): string => {
  if (!title) return "";
  const s = String(title).trim();
  const lower = s.toLowerCase();
  if (lower === "null" || lower === "undefined" || s === "-") return "";
  return s;
};

/**
 * Memeriksa apakah sebuah baris data SPB hanyalah catatan/keterangan kosong
 * (tidak dihitung sebagai barang riil).
 */
export const isKeteranganBarang = (row: any): boolean => {
  if (!row) return true;
  const name = String(row.nama_barang_spb || row.nama_barang || "").toLowerCase();
  if (!name.trim()) return true;
  return name.includes("keterangan") || name.includes("catatan");
};

/**
 * Menentukan status dari satu baris item SPB (untuk konsumsi Chatbot).
 * Menggunakan `toIdNumber` agar deteksi "sudah PO" tidak lagi bergantung pada
 * tipe string/number dari kolom id_po.
 */
export const resolveSpbItemStatus = (row: any): string => {
  if (!row) return "Belum PO";

  const tgl = row.material_datang_tgl;
  const req = Number(row.qty_permintaan || 0);
  const arr = Number(row.material_datang_qty || 0);
  const hasPo = !!cleanDocNo(row.no_po) || toIdNumber(row.id_po) !== null;

  if (tgl) {
    if (req === arr) return "Datang Sesuai";
    if (req < arr) return "Datang Lebih";
    return "Datang Kurang";
  }
  if (hasPo) return "Sudah PO";

  const raw = String(row.status || "").toLowerCase().trim();
  if (raw === "belum di proses") return "Belum Diproses";

  return "Belum PO";
};