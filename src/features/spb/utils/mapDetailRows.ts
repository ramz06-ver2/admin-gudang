// src/features/spb/utils/mapDetailRows.ts
import type { SPBItemDetail } from "../../../shared/types";
import { cleanDocNo } from "../suratJalanRules";
import type { MonitoringDetailItem } from "../types";
import { calcLamaProses } from "./statusHelpers";

export type Row = Record<string, any>;

export const first = (v: unknown): Row | null => {
  const x = Array.isArray(v) ? v[0] : v;
  return x && typeof x === "object" ? (x as Row) : null;
};

export const numOrZero = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const sortById = (rows: Row[]): Row[] =>
  [...rows].sort((a, b) => numOrZero(a.id) - numOrZero(b.id));

export const unique = <T>(arr: T[]): T[] => Array.from(new Set(arr));

export const unwrap = (res: { data: unknown; error: unknown }): Row[] => {
  if (res.error) throw res.error;
  return (res.data as Row[] | null) ?? [];
};

// 🔧 HELPER BARU: Menghitung status kedatangan (Sesuai / Kurang / Lebih)
const resolveArrivalStatus = (
  req: number | null | undefined,
  arr: number,
  tglDatang: string | null,
  fallbackStatus: string,
): string => {
  if (!tglDatang) return fallbackStatus;

  if (req !== undefined && req !== null) {
    const r = Number(req);
    if (r === arr) return "Datang Sesuai";
    if (r < arr) return "Datang Lebih";
    return "Datang Kurang";
  }
  return "Datang"; // Fallback jika tidak ada data permintaan
};

const spbStatus = (
  req: number,
  arr: number,
  tglDatang: string | null,
  hasPo: boolean,
): string => {
  if (tglDatang) {
    if (req === arr) return "Datang Sesuai";
    if (req < arr) return "Datang Lebih";
    return "Datang Kurang";
  }
  return hasPo ? "Sudah PO" : "Belum PO";
};

export const mapSpbRow = (
  row: Row,
  fallbackPo: Row | null,
): MonitoringDetailItem => {
  const joinedPo = first(row.po);
  const poNo = cleanDocNo(joinedPo?.no_po) ?? cleanDocNo(fallbackPo?.no_po);
  const req = numOrZero(row.qty_permintaan);
  const arr = numOrZero(row.material_datang_qty);
  const tgl: string | null = row.material_datang_tgl || null;
  const rawStatus = String(row.status || "").toLowerCase().trim();

  let status = spbStatus(req, arr, tgl, !!poNo);
  if (status === "Belum PO" && rawStatus === "belum di proses") {
    status = "Belum Diproses";
  }

  return {
    key: `spb-${row.id}`,
    sumber: "spb",
    id: row.id,
    no_spb: cleanDocNo(row.no_spb) ?? "-",
    judul_spb: row.judul_spb ?? null,
    tanggal_spb: row.tgl_spb ?? null,
    nama_barang: row.nama_barang_spb || "-",
    ukuran: row.ukuran ?? null,
    spesifikasi_teknis: row.spesifikasi_teknis ?? null,
    jumlah_permintaan: req,
    satuan: row.satuan ?? null,
    no_po: poNo ?? "-",
    tanggal_po: joinedPo?.tanggal_po ?? fallbackPo?.tanggal_po ?? null,
    tanggal_datang: tgl,
    qty_datang: arr,
    status,
    spbSourceFile: row.source_file,
    poSourceFile: joinedPo?.source_file ?? fallbackPo?.source_file,
  };
};

export const mapPoRow = (row: Row): MonitoringDetailItem => {
  const tgl: string | null = row.material_datang_tgl || null;
  const arr = numOrZero(row.material_datang_qty);
  const status = tgl ? "Datang" : "Sudah PO";

  return {
    key: `po-${row.id}`,
    sumber: "po",
    id: row.id,
    no_spb: "-",
    nama_barang: row.nama_barang_po || "-",
    jumlah_permintaan: null,
    satuan: row.material_datang_satuan ?? row.satuan ?? null,
    no_po: cleanDocNo(row.no_po) ?? "-",
    tanggal_po: row.tanggal_po ?? null,
    tanggal_datang: tgl,
    qty_datang: arr,
    status,
    poSourceFile: row.source_file,
  };
};

// 🔧 PERBAIKAN: mapSjRow sekarang menghitung status berdasarkan qty_permintaan dari SPB
export const mapSjRow = (row: Row): MonitoringDetailItem => {
  const spb = first(row.spb);
  const po = first(row.po);
  const tgl: string | null = row.material_datang_tgl || null;
  const arr = numOrZero(row.material_datang_qty ?? row.jumlah);
  const req =
    spb?.qty_permintaan !== undefined && spb?.qty_permintaan !== null
      ? numOrZero(spb.qty_permintaan)
      : null;

  return {
    key: `sj-${row.id}`,
    sumber: "sj",
    id: row.id,
    no_surat_jalan:
      row.no_surat_jalan != null ? String(row.no_surat_jalan) : null,
    no_spb: cleanDocNo(spb?.no_spb) ?? "-",
    judul_spb: spb?.judul_spb ?? null,
    nama_barang: row.nama_barang || "-",
    jumlah_permintaan: req,
    satuan: row.material_datang_satuan ?? row.satuan ?? null,
    no_po: cleanDocNo(po?.no_po) ?? "-",
    tanggal_po: null,
    tanggal_datang: tgl,
    qty_datang: arr,
    status: resolveArrivalStatus(req, arr, tgl, "Belum Datang"),
    spbSourceFile: spb?.source_file,
    poSourceFile: po?.source_file,
  };
};

/**
 * Memetakan baris tunggal dari tabel `po` menjadi `SPBItemDetail`.
 */
export const mapSinglePoItem = (data: Row): SPBItemDetail => {
  const spbRel = first(data.spb); // 🔧 Ambil relasi SPB
  const tglDatang = data.material_datang_tgl || null;
  const arr = data.material_datang_qty ?? 0;
  const satuanDatang = data.material_datang_satuan || data.satuan || "-";
  const req = spbRel?.qty_permintaan ?? null;

  return {
    ...data,
    no_spb: spbRel?.no_spb || "-",
    tanggal_spb: null,
    nama_barang: data.nama_barang_po || data.nama_barang || "-",
    ukuran: data.ukuran || "-",
    jumlah_permintaan: req !== null ? Number(req) : null, // 🔧 Tampilkan qty permintaan
    satuan: data.satuan || data.material_datang_satuan || "-",
    no_po: data.no_po || "-",
    tanggal_po: data.tanggal_po || null,
    supplier: data.nama_supplier || data.supplier || "-",
    merk: data.merk || "-",
    spesifikasi_teknis: data.spesifikasi_teknis || data.spesifikasi || "-",
    lokasi_pemasangan: data.lokasi_pemasangan || "-",
    rencana_pemasangan: data.rencana_pemasangan || "-",
    tanggal_datang: tglDatang,
    qty_datang: arr,
    satuan_datang: satuanDatang,
    lama_proses: calcLamaProses(data.tanggal_po, tglDatang, data.lama_proses),
    kurang_lebih: data.kurang_lebih ?? "-",
    keterangan: data.keterangan || "-",
    status: resolveArrivalStatus(req, Number(arr), tglDatang, "Sudah PO"),
    poSourceFile: data.source_file,
  } as SPBItemDetail;
};

/**
 * Memetakan baris tunggal dari tabel `surat_jalan` menjadi `SPBItemDetail`.
 */
export const mapSingleSjItem = (data: Row): SPBItemDetail => {
  const spbRel = first(data.spb);
  const poRel = first(data.po);
  const tgl = data.material_datang_tgl || null;
  const arr = data.material_datang_qty ?? data.jumlah ?? 0;
  const req = spbRel?.qty_permintaan ?? null; // 🔧 Ambil qty permintaan

  return {
    ...data,
    no_surat_jalan: data.no_surat_jalan ?? "-",
    no_spb: spbRel?.no_spb || "-",
    tanggal_spb: spbRel?.tgl_spb || null,
    no_po: poRel?.no_po || "-",
    tanggal_po: poRel?.tanggal_po || null,
    supplier: poRel?.nama_supplier || data.supplier || "-",
    nama_barang: data.nama_barang || "-",
    ukuran: data.ukuran || "-",
    jumlah_permintaan: req !== null ? Number(req) : null, // 🔧 Tampilkan qty permintaan
    satuan: data.satuan || data.material_datang_satuan || "-",
    merk: data.merk || "-",
    spesifikasi_teknis: data.spesifikasi || data.spesifikasi_teknis || "-",
    lokasi_pemasangan: data.lokasi_pemasangan || "-",
    rencana_pemasangan: data.rencana_pemasangan || "-",
    tanggal_datang: tgl,
    qty_datang: arr,
    satuan_datang: data.material_datang_satuan || data.satuan || "-",
    lama_proses: calcLamaProses(
      data.tanggal_surat_jalan || poRel?.tanggal_po,
      tgl,
      data.lama_proses,
    ),
    kurang_lebih: data.kurang_lebih ?? "-",
    keterangan: data.keterangan || "-",
    status: resolveArrivalStatus(req, Number(arr), tgl, "Belum Datang"),
    spbSourceFile: spbRel?.source_file,
    poSourceFile: poRel?.source_file,
  } as SPBItemDetail;
};

/**
 * Memetakan baris tunggal dari tabel `spb` (+ relasi `po`) menjadi `SPBItemDetail`.
 */
export const mapSingleSpbItem = (
  data: Row,
  dataPo: Row | null | undefined,
): SPBItemDetail => {
  const req = data.qty_permintaan ?? 0;
  const arr = data.material_datang_qty ?? data.qty_datang ?? 0;
  const tglDatang = data.material_datang_tgl || null;
  const tglSpb = data.tgl_spb || data.tanggal_pembuatan_spb || null;
  const tglPo = dataPo?.tanggal_po || null;
  const rawStatus = String(data.status || "").toLowerCase().trim();

  let status = "Belum PO";
  if (tglDatang) {
    if (req === arr) status = "Datang Sesuai";
    else if (req < arr) status = "Datang Lebih";
    else if (req > arr) status = "Datang Kurang";
    else status = "Datang";
  } else if (
    dataPo?.no_po &&
    dataPo.no_po !== "-" &&
    dataPo.no_po !== "null"
  ) {
    status = "Sudah PO";
  } else if (rawStatus === "belum di proses") {
    status = "Belum Diproses";
  }

  const diffQty = arr - req;
  const kurangLebih =
    data.kurang_lebih !== undefined && data.kurang_lebih !== null
      ? data.kurang_lebih
      : diffQty;

  return {
    ...data,
    no_spb: data.no_spb || "-",
    tanggal_spb: tglSpb,
    nama_barang: data.nama_barang_spb || data.nama_barang || "-",
    ukuran: data.ukuran || "-",
    jumlah_permintaan: req,
    satuan: data.satuan || "-",
    no_po: dataPo?.no_po || "-",
    tanggal_po: tglPo,
    supplier:
      dataPo?.nama_supplier || dataPo?.supplier || data.supplier || "-",
    merk: data.merk || "-",
    spesifikasi_teknis: data.spesifikasi_teknis || "-",
    lokasi_pemasangan: data.lokasi_pemasangan || "-",
    rencana_pemasangan: data.rencana_pemasangan || "-",
    tanggal_datang: tglDatang,
    qty_datang: arr,
    satuan_datang:
      data.material_datang_satuan || data.satuan_datang || data.satuan || "-",
    lama_proses: calcLamaProses(tglPo || tglSpb, tglDatang, data.lama_proses),
    kurang_lebih: kurangLebih,
    keterangan: data.keterangan || "-",
    status,
    spbSourceFile: data.source_file,
    poSourceFile: dataPo?.source_file,
  } as SPBItemDetail;
};