// src/features/spb/shared/spbStatusCache.ts
//
// Cache status SEMUA barang (tabel spb, po, dan surat_jalan).
//
// - Status dihitung dengan fungsi map yang SAMA dengan halaman Monitoring SPB
//   (mapSpbRow / mapPoRow / mapSjRow), dilengkapi pengayaan relasi lintas tabel
//   agar barang pada Surat Jalan (mis. SJ 1 = 148 barang, SJ 2 = 54 barang, SJ 3 = 138 barang)
//   serta SPB/PO selalu memiliki tanggal kedatangan dan status yang akurat.
// - Disimpan di memori + localStorage (kedaluwarsa 5 menit), jadi membuka
//   halaman Analitik berulang kali tidak perlu mengambil ulang ribuan baris.
// - Cache dipisah per hak akses: user publik TIDAK PERNAH menerima/menyimpan
//   baris berstatus "belum di proses". Cache versi login dihapus otomatis
//   begitu user tidak lagi login.
import { fetchMonitoringRawData } from "../spb-monitoring/api";
import {
  canViewRestrictedSpb,
  filterVisibleSpbRows,
  isRestrictedSpbStatus,
} from "../spb-monitoring/accessRules";
import {
  cleanDocNo,
  isKeteranganBarang,
  toIdNumber,
} from "../spb-monitoring/suratJalanRules";
import {
  first,
  mapPoRow,
  mapSjRow,
  mapSpbRow,
  type Row,
} from "../spb-monitoring/utils/mapDetailRows";

export type SpbStatusSource = "spb" | "po" | "sj";
type CacheScope = "restricted" | "public";

export interface SpbStatusEntry {
  key: string; // mis. "spb-12", "po-5", "sj-9"
  sumber: SpbStatusSource;
  id: number | string;
  /** id SPB yang dimiliki barang ini (null = tidak terhubung ke SPB mana pun). */
  idSpb: number | null;
  noSpb: string | null;
  noPo: string | null;
  noSuratJalan?: string | null;
  tglSpb: string | null;
  tglDatang: string | null;
  /** Status final: Belum Diproses / Belum PO / Sudah PO / Datang Sesuai / Datang Kurang / Datang Lebih / Datang */
  status: string;
  /** true bila baris hanya catatan/keterangan (bukan barang riil). */
  keterangan: boolean;
}

export interface SpbStatusCache {
  version: number;
  scope: CacheScope;
  savedAt: number;
  entries: SpbStatusEntry[];
}

const CACHE_VERSION = 2;
const LEGACY_VERSIONS = [1];
export const SPB_STATUS_CACHE_TTL_MS = 5 * 60 * 1000;
const storageKey = (scope: CacheScope, version = CACHE_VERSION) =>
  `spb-status-cache:v${version}:${scope}`;

const memory = new Map<CacheScope, SpbStatusCache>();
const inflight = new Map<CacheScope, Promise<SpbStatusCache>>();

const purgeLegacyStorage = () => {
  try {
    for (const v of LEGACY_VERSIONS) {
      localStorage.removeItem(storageKey("restricted", v));
      localStorage.removeItem(storageKey("public", v));
    }
  } catch {
    // ignore
  }
};

const readStorage = (scope: CacheScope): SpbStatusCache | null => {
  try {
    purgeLegacyStorage();
    const raw = localStorage.getItem(storageKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SpbStatusCache;
    if (
      parsed?.version !== CACHE_VERSION ||
      parsed.scope !== scope ||
      !Array.isArray(parsed.entries)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeStorage = (cache: SpbStatusCache) => {
  try {
    localStorage.setItem(storageKey(cache.scope), JSON.stringify(cache));
  } catch {
    // kuota penuh / storage dinonaktifkan: cache memori tetap berfungsi
  }
};

const removeStorage = (scope: CacheScope) => {
  try {
    localStorage.removeItem(storageKey(scope));
  } catch {
    // ignore
  }
};

const isFresh = (c: SpbStatusCache) =>
  Date.now() - c.savedAt < SPB_STATUS_CACHE_TTL_MS;

const buildCache = async (
  canView: boolean,
  signal?: AbortSignal,
): Promise<SpbStatusCache> => {
  const { allSpbData, poData, sjData } = await fetchMonitoringRawData(signal);

  const spbRows = (allSpbData as Row[]) ?? [];
  const poRows = (poData as Row[]) ?? [];
  const sjRows = (sjData as Row[]) ?? [];

  // User publik tidak boleh melihat SPB "belum di proses" -> turunannya (PO/SJ) ikut disembunyikan.
  const hiddenSpbIds = new Set<number>();
  if (!canView) {
    spbRows.forEach((r) => {
      if (isRestrictedSpbStatus(r.status)) {
        const id = toIdNumber(r.id);
        if (id !== null) hiddenSpbIds.add(id);
      }
    });
  }

  // Indeks lintas tabel untuk memperkaya relasi SPB <-> PO <-> Surat Jalan
  const spbById = new Map<number, Row>();
  spbRows.forEach((r) => {
    const id = toIdNumber(r.id);
    if (id !== null) spbById.set(id, r);
  });

  const poById = new Map<number, Row>();
  const poBySpbId = new Map<number, Row>();
  poRows.forEach((p) => {
    const poId = toIdNumber(p.id);
    if (poId !== null) poById.set(poId, p);
    const idSpb = toIdNumber(p.id_spb);
    if (idSpb !== null && cleanDocNo(p.no_po) && !poBySpbId.has(idSpb)) {
      poBySpbId.set(idSpb, p);
    }
  });

  // Indeks SJ yang sudah memiliki tanggal datang / tanggal surat jalan per id_spb
  const sjArrivalBySpbId = new Map<
    number,
    { tglDatang: string; qtyDatang: number }
  >();
  sjRows.forEach((sj) => {
    const idSpb = toIdNumber(sj.id_spb);
    if (idSpb === null) return;
    const tgl = sj.material_datang_tgl || sj.tanggal_surat_jalan || null;
    if (!tgl) return;
    const qty = Number(sj.material_datang_qty ?? sj.jumlah ?? 0) || 0;
    const prev = sjArrivalBySpbId.get(idSpb);
    if (!prev) {
      sjArrivalBySpbId.set(idSpb, { tglDatang: tgl, qtyDatang: qty });
    } else {
      prev.qtyDatang += qty;
    }
  });

  const entries: SpbStatusEntry[] = [];

  filterVisibleSpbRows(spbRows, canView).forEach((r) => {
    const idSpb = toIdNumber(r.id);
    const parentPoId = toIdNumber(r.id_po);
    const fallbackPo =
      (idSpb !== null ? poBySpbId.get(idSpb) : null) ??
      (parentPoId !== null ? poById.get(parentPoId) : null) ??
      null;

    // Jika baris SPB belum punya material_datang_tgl tetapi tercatat di Surat Jalan, warisi kedatangannya
    let spbInput = r;
    if (!r.material_datang_tgl && idSpb !== null) {
      const sjArr = sjArrivalBySpbId.get(idSpb);
      if (sjArr) {
        spbInput = {
          ...r,
          material_datang_tgl: sjArr.tglDatang,
          material_datang_qty: r.material_datang_qty ?? sjArr.qtyDatang,
        };
      }
    }

    const it = mapSpbRow(spbInput, fallbackPo);
    entries.push({
      key: it.key,
      sumber: "spb",
      id: it.id as number | string,
      idSpb,
      noSpb: cleanDocNo(r.no_spb),
      noPo: cleanDocNo(it.no_po),
      tglSpb: r.tgl_spb ?? null,
      tglDatang: it.tanggal_datang ?? null,
      status: it.status ?? "Belum PO",
      keterangan: isKeteranganBarang(r),
    });
  });

  poRows.forEach((r) => {
    const idSpb = toIdNumber(r.id_spb);
    if (idSpb !== null && hiddenSpbIds.has(idSpb)) return;
    const parentSpb = idSpb !== null ? spbById.get(idSpb) : null;
    const it = mapPoRow(r);
    entries.push({
      key: it.key,
      sumber: "po",
      id: it.id as number | string,
      idSpb,
      noSpb: cleanDocNo(parentSpb?.no_spb),
      noPo: cleanDocNo(it.no_po),
      tglSpb: parentSpb?.tgl_spb ?? null,
      tglDatang: it.tanggal_datang ?? null,
      status: it.status ?? "Belum PO",
      keterangan: isKeteranganBarang(r),
    });
  });

  sjRows.forEach((r) => {
    const idSpb = toIdNumber(r.id_spb);
    if (idSpb !== null && hiddenSpbIds.has(idSpb)) return;
    const idPo = toIdNumber(r.id_po);

    const spbRel = first(r.spb);
    const poRel = first(r.po);
    const parentSpb = idSpb !== null ? spbById.get(idSpb) : null;
    const parentPo = idPo !== null ? poById.get(idPo) : null;

    const mergedSpb: Row | null =
      spbRel || parentSpb
        ? {
            ...(parentSpb ?? {}),
            ...(spbRel ?? {}),
            qty_permintaan:
              spbRel?.qty_permintaan ?? parentSpb?.qty_permintaan ?? null,
            tgl_spb: spbRel?.tgl_spb ?? parentSpb?.tgl_spb ?? null,
          }
        : null;

    const mergedPo: Row | null =
      poRel || parentPo
        ? {
            ...(parentPo ?? {}),
            ...(poRel ?? {}),
          }
        : null;

    const resolvedTglDatang =
      r.material_datang_tgl ||
      r.tanggal_surat_jalan ||
      mergedSpb?.material_datang_tgl ||
      mergedPo?.material_datang_tgl ||
      null;

    const enrichedSjRow: Row = {
      ...r,
      material_datang_tgl: resolvedTglDatang,
      material_datang_qty: r.material_datang_qty ?? r.jumlah ?? null,
      spb: mergedSpb,
      po: mergedPo,
    };

    const it = mapSjRow(enrichedSjRow);
    entries.push({
      key: it.key,
      sumber: "sj",
      id: it.id as number | string,
      idSpb,
      noSpb: cleanDocNo(it.no_spb),
      noPo: cleanDocNo(it.no_po),
      noSuratJalan: cleanDocNo(r.no_surat_jalan),
      tglSpb: mergedSpb?.tgl_spb ?? null,
      tglDatang: it.tanggal_datang ?? null,
      status: it.status ?? "Belum Datang",
      keterangan: isKeteranganBarang(r),
    });
  });

  return {
    version: CACHE_VERSION,
    scope: canView ? "restricted" : "public",
    savedAt: Date.now(),
    entries,
  };
};

/**
 * Ambil cache status semua barang. Dipakai ulang selama < 5 menit;
 * `force: true` memaksa ambil ulang. Jika server gagal tetapi ada cache lama,
 * cache lama dipakai agar halaman tidak kosong.
 */
export const getSpbStatusCache = async (
  opts: {
    force?: boolean;
    canViewRestricted?: boolean;
    signal?: AbortSignal;
  } = {},
): Promise<SpbStatusCache> => {
  const canView = opts.canViewRestricted ?? canViewRestrictedSpb();
  const scope: CacheScope = canView ? "restricted" : "public";

  if (!canView) {
    memory.delete("restricted");
    removeStorage("restricted");
  }

  if (!opts.force) {
    const hit = memory.get(scope) ?? readStorage(scope);
    if (hit && isFresh(hit)) {
      memory.set(scope, hit);
      return hit;
    }
  }

  const pending = inflight.get(scope);
  if (pending) return pending;

  const job = (async () => {
    try {
      const fresh = await buildCache(canView, opts.signal);
      memory.set(scope, fresh);
      writeStorage(fresh);
      return fresh;
    } catch (err) {
      if ((err as Error)?.name === "AbortError") throw err;
      const stale = memory.get(scope) ?? readStorage(scope);
      if (stale) return stale;
      throw err;
    } finally {
      inflight.delete(scope);
    }
  })();

  inflight.set(scope, job);
  return job;
};

/** Hapus cache (panggil setelah data SPB/PO/SJ diubah atau diimport agar langsung segar). */
export const invalidateSpbStatusCache = () => {
  memory.clear();
  inflight.clear();
  purgeLegacyStorage();
  removeStorage("restricted");
  removeStorage("public");
};

export const isArrivedStatus = (status: string): boolean =>
  status.startsWith("Datang");

/**
 * Khusus Analitik (Distribusi Bar & Kartu Ringkasan SPB):
 * Hanya barang yang memiliki id SPB dan berasal dari tabel SPB.
 * Baris PO / Surat Jalan yang hanya "turunan" barang SPB (atau berdiri sendiri
 * tanpa SPB) tidak ikut dihitung pada total barang SPB agar satu barang SPB tidak terhitung dua kali.
 */
export const selectSpbOnlyEntries = (cache: SpbStatusCache): SpbStatusEntry[] =>
  cache.entries.filter(
    (e) => e.sumber === "spb" && e.idSpb !== null && !e.keterangan,
  );

/**
 * Khusus Timeline "Barang Datang" pada Analitik:
 * - Mengutamakan seluruh baris aktual pada Surat Jalan (`sumber === "sj"`) yang sudah datang
 *   (mis. Surat Jalan No 1 = 148 barang pada 2026-07-28, No 2 = 54 barang pada 2026-09-05, No 3 = 138 barang pada 2026-10-24).
 * - Ditambah baris SPB (`sumber === "spb"`) yang sudah datang secara langsung namun TIDAK tercatat di Surat Jalan mana pun,
 *   sehingga tidak ada barang yang terlewat maupun terhitung ganda.
 */
export const selectArrivalEntries = (cache: SpbStatusCache): SpbStatusEntry[] => {
  const sjArrivals = cache.entries.filter(
    (e) =>
      e.sumber === "sj" &&
      !e.keterangan &&
      isArrivedStatus(e.status) &&
      !!e.tglDatang,
  );

  const coveredSpbIds = new Set<number>(
    sjArrivals.map((e) => e.idSpb).filter((id): id is number => id !== null),
  );

  const directSpbArrivals = cache.entries.filter(
    (e) =>
      e.sumber === "spb" &&
      !e.keterangan &&
      isArrivedStatus(e.status) &&
      !!e.tglDatang &&
      (e.idSpb === null || !coveredSpbIds.has(e.idSpb)),
  );

  return [...sjArrivals, ...directSpbArrivals];
};
