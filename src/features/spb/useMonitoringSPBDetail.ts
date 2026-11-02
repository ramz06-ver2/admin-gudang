// src/features/spb/useMonitoringSPBDetail.ts
import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../../shared/lib/supabaseClient";
import type { SPBItemDetail } from "../../shared/types";
import { cleanDocNo, hasValue, isIgnoredSuratJalan } from "./suratJalanRules";

export type ItemSource = "spb" | "po" | "sj";

export type MonitoringDetailItem = SPBItemDetail & {
  key: string;
  sumber: ItemSource;
  no_surat_jalan?: string | null;
};

type Row = Record<string, any>;

const SPB_SELECT = `*, po:po!id_po (no_po, tanggal_po)`;
const SJ_SELECT = `*, spb:spb!id_spb (no_spb, judul_spb), po:po!id_po (no_po)`;

const first = (v: unknown): Row | null => {
  const x = Array.isArray(v) ? v[0] : v;
  return x && typeof x === "object" ? (x as Row) : null;
};

const numOrZero = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const sortById = (rows: Row[]): Row[] =>
  [...rows].sort((a, b) => numOrZero(a.id) - numOrZero(b.id));

const unique = <T,>(arr: T[]): T[] => Array.from(new Set(arr));

const unwrap = (res: { data: unknown; error: unknown }): Row[] => {
  if (res.error) throw res.error;
  return (res.data as Row[] | null) ?? [];
};

const spbStatus = (req: number, arr: number, tglDatang: string | null, hasPo: boolean) => {
  if (tglDatang) {
    if (req === arr) return "Datang Sesuai";
    if (req < arr) return "Datang Lebih";
    return "Datang Kurang";
  }
  return hasPo ? "Sudah PO" : "Belum PO";
};

const mapSpbRow = (row: Row, fallbackPo: Row | null): MonitoringDetailItem => {
  const joinedPo = first(row.po);
  const poNo = cleanDocNo(joinedPo?.no_po) ?? cleanDocNo(fallbackPo?.no_po);
  const req = numOrZero(row.qty_permintaan);
  const arr = numOrZero(row.material_datang_qty);
  const tgl: string | null = row.material_datang_tgl || null;

  // 🔧 Normalisasi status dari database (jaga-jaga ada spasi atau beda kapital)
  const rawStatus = String(row.status || "").toLowerCase().trim();

  let status = spbStatus(req, arr, tgl, !!poNo);
  
  // 🔧 PERBAIKAN: Jika belum PO tapi dari DB statusnya "belum di proses"
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
  };
};

const mapPoRow = (row: Row): MonitoringDetailItem => {
  const tgl: string | null = row.material_datang_tgl || null;
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
    qty_datang: numOrZero(row.material_datang_qty),
    status: tgl ? "Datang" : "Sudah PO",
  };
};

const mapSjRow = (row: Row): MonitoringDetailItem => {
  const spb = first(row.spb);
  const po = first(row.po);
  const tgl: string | null = row.material_datang_tgl || null;
  return {
    key: `sj-${row.id}`,
    sumber: "sj",
    id: row.id,
    no_surat_jalan: row.no_surat_jalan != null ? String(row.no_surat_jalan) : null,
    no_spb: cleanDocNo(spb?.no_spb) ?? "-",
    judul_spb: spb?.judul_spb ?? null,
    nama_barang: row.nama_barang || "-",
    jumlah_permintaan: null,
    satuan: row.material_datang_satuan ?? row.satuan ?? null,
    no_po: cleanDocNo(po?.no_po) ?? "-",
    tanggal_po: null,
    tanggal_datang: tgl,
    qty_datang: numOrZero(row.material_datang_qty),
    status: tgl ? "Datang" : "Belum Datang",
  };
};

const fetchBySpb = async (
  spbNo: string,
  judulSpb: string | null = null,
): Promise<MonitoringDetailItem[]> => {
  let spbQuery = supabaseClient
    .from("spb")
    .select(SPB_SELECT)
    .eq("no_spb", spbNo);
  if (judulSpb) spbQuery = spbQuery.eq("judul_spb", judulSpb);

  const spbRows = sortById(unwrap(await spbQuery));
  if (spbRows.length === 0) return [];

  const spbIds = spbRows.map((r) => r.id);

  const [poRes, sjRes] = await Promise.all([
    supabaseClient.from("po").select("id, no_po, tanggal_po, id_spb").in("id_spb", spbIds),
    supabaseClient.from("surat_jalan").select(SJ_SELECT).in("id_spb", spbIds),
  ]);

  const poBySpbId = new Map<string, Row>();
  unwrap(poRes).forEach((p) => {
    const key = String(p.id_spb);
    if (cleanDocNo(p.no_po) && !poBySpbId.has(key)) poBySpbId.set(key, p);
  });

  const spbItems = spbRows.map((r) => mapSpbRow(r, poBySpbId.get(String(r.id)) ?? null));
  const sjItems = sortById(unwrap(sjRes))
    .filter((sj) => !isIgnoredSuratJalan(sj.no_surat_jalan))
    .map(mapSjRow);

  return [...spbItems, ...sjItems];
};

const fetchByPo = async (poNo: string): Promise<MonitoringDetailItem[]> => {
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
    supabaseClient.from("surat_jalan").select(SJ_SELECT).in("id_po", poIds).is("id_spb", null),
  ]);

  const existingParentSpb = new Set(unwrap(parentSpbRes).map((s) => String(s.id)));
  const poIdsUsedBySpb = new Set(unwrap(spbPointingRes).map((s) => String(s.id_po)));

  const isLinkedToSpb = (p: Row) =>
    (hasValue(p.id_spb) && existingParentSpb.has(String(p.id_spb))) ||
    poIdsUsedBySpb.has(String(p.id));

  const poItems = poRows.filter((p) => !isLinkedToSpb(p)).map(mapPoRow);
  const sjItems = sortById(unwrap(sjRes))
    .filter((sj) => !isIgnoredSuratJalan(sj.no_surat_jalan))
    .map(mapSjRow);

  return [...poItems, ...sjItems];
};

const fetchBySuratJalan = async (sjNo: string): Promise<MonitoringDetailItem[]> => {
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

export const useMonitoringSPBDetail = (
  spbNo: string | null,
  poNo: string | null,
  sjNo: string | null = null,
  judulSpb: string | null = null,
) => {
  const enabled = !!(spbNo || poNo || sjNo);

  const { data, isLoading, error } = useQuery<MonitoringDetailItem[]>({
    queryKey: ["monitoring-spb-detail", spbNo, poNo, sjNo, judulSpb],
    queryFn: async () => {
      if (spbNo) return fetchBySpb(spbNo, judulSpb);
      if (poNo) return fetchByPo(poNo);
      if (sjNo) return fetchBySuratJalan(sjNo);
      return [];
    },
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    items: data ?? [],
    isLoading: enabled ? isLoading : false,
    error: error as Error | null,
  };
};