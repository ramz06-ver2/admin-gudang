import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fakeDb, fakeSupabaseClient } from "../../utils/fakeSupabase";

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabaseClient: fakeSupabaseClient,
}));

import tabelSpb from "../../../cjs/tabel_spb.json";
import tabelPo from "../../../cjs/tabel_po.json";
import tabelSuratJalan from "../../../cjs/tabel_surat_jalan.json";
import {
  DEFAULT_QUERY_OPTIONS,
  createAppQueryClient,
} from "@/shared/lib/queryClient";
import {
  MUTATION_INVALIDATION_MAP,
  QUERY_KEYS,
  STALE_TIMES,
  invalidateOnMutation,
} from "@/shared/lib/queryKeys";
import { fetchAllRows } from "@/features/spb/spb-monitoring/api";
import {
  getSpbStatusCache,
  invalidateSpbStatusCache,
  isArrivedStatus,
  selectArrivalEntries,
  selectSpbOnlyEntries,
} from "@/features/spb/shared/spbStatusCache";
import { useSpbAnalytics } from "@/features/spb/analytics-spb/useSpbAnalytics";
import { STORAGE_KEY } from "@/app/providers/authProvider";

function createWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("Sistem Caching Enterprise & Akurasi SPB Status Cache (SJ 1 = 148 Barang)", () => {
  beforeEach(() => {
    fakeDb.reset();
    localStorage.clear();
    invalidateSpbStatusCache();
  });

  it("1. Konfigurasi default QueryClient sesuai standar perusahaan (staleTime, cacheTime, refetchOnWindowFocus: false, retry: 1)", () => {
    const client = createAppQueryClient();
    const defaults = client.getDefaultOptions();

    expect(DEFAULT_QUERY_OPTIONS.queries?.staleTime).toBe(60_000);
    expect(DEFAULT_QUERY_OPTIONS.queries?.cacheTime).toBe(5 * 60_000);
    expect(DEFAULT_QUERY_OPTIONS.queries?.refetchOnWindowFocus).toBe(false);
    expect(DEFAULT_QUERY_OPTIONS.queries?.retry).toBe(1);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
    expect(STALE_TIMES.MONITORING_SPB).toBe(5 * 60_000);
    expect(STALE_TIMES.STOCK_IN_CHART).toBe(5 * 60_000);
  });

  it("2. Invalidasi lintas fitur terpusat (invalidateOnMutation) meng-invalidate seluruh query terkait secara atomik", async () => {
    const qc = createAppQueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    await invalidateOnMutation(qc, "stock-out");
    const stockOutKeys = spy.mock.calls.map((c) => (c[0] as any)?.queryKey);
    expect(stockOutKeys).toEqual(
      MUTATION_INVALIDATION_MAP["stock-out"].map((k) => [...k]),
    );
    expect(stockOutKeys).toContainEqual(["products"]);
    expect(stockOutKeys).toContainEqual(["product-search"]);
    expect(stockOutKeys).toContainEqual(["low-stock"]);
    expect(stockOutKeys).toContainEqual(["stock-exits"]);
    expect(stockOutKeys).toContainEqual(["dashboard-stats"]);

    spy.mockClear();
    let sideEffectCalled = false;
    await invalidateOnMutation(qc, "spb-update", () => {
      sideEffectCalled = true;
    });
    expect(sideEffectCalled).toBe(true);
    const spbKeys = spy.mock.calls.map((c) => (c[0] as any)?.queryKey);
    expect(spbKeys).toContainEqual([...QUERY_KEYS.monitoringSpbAll]);
    expect(spbKeys).toContainEqual([...QUERY_KEYS.spbAnalyticsAll]);
  });

  it("3. fetchAllRows mendukung pembatalan request dengan AbortSignal (mencegah memory leak saat pindah halaman)", async () => {
    fakeDb.tables.spb = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      no_spb: String(i + 1),
    }));

    const controller = new AbortController();
    controller.abort();

    await expect(
      fetchAllRows("spb", "*", controller.signal),
    ).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fakeDb.queriesTo("spb")).toBe(0);
  });

  it("4. Surat Jalan No 1 (148 barang), No 2 (54 barang), dan No 3 (138 barang) tercatat lengkap sebagai sudah datang di spbStatusCache & Analitik", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        id: "admin-1",
        email: "admin@perusahaan.com",
        name: "Admin",
        role: "admin",
      }),
    );

    const poById = new Map((tabelPo as any[]).map((p) => [p.id, p]));
    const spbById = new Map((tabelSpb as any[]).map((s) => [s.id, s]));

    fakeDb.tables.spb = (tabelSpb as any[]).map((s) => ({
      ...s,
      po: s.id_po ? (poById.get(s.id_po) ?? null) : null,
    }));
    fakeDb.tables.po = [...(tabelPo as any[])];
    fakeDb.tables.surat_jalan = (tabelSuratJalan as any[]).map((sj) => ({
      ...sj,
      spb: sj.id_spb ? (spbById.get(sj.id_spb) ?? null) : null,
      po: sj.id_po ? (poById.get(sj.id_po) ?? null) : null,
    }));

    const cache = await getSpbStatusCache({ canViewRestricted: true });

    // Pastikan seluruh baris Surat Jalan No 1 (148 barang) berstatus Datang dengan tglDatang 2026-07-28
    const sj1Entries = cache.entries.filter(
      (e) => e.sumber === "sj" && e.noSuratJalan === "1",
    );
    expect(sj1Entries).toHaveLength(148);
    expect(sj1Entries.every((e) => isArrivedStatus(e.status))).toBe(true);
    expect(sj1Entries.every((e) => e.tglDatang === "2026-07-28")).toBe(true);

    // Pastikan seluruh baris Surat Jalan No 2 (54 barang) berstatus Datang dengan tglDatang 2026-09-05
    const sj2Entries = cache.entries.filter(
      (e) => e.sumber === "sj" && e.noSuratJalan === "2",
    );
    expect(sj2Entries).toHaveLength(54);
    expect(sj2Entries.every((e) => isArrivedStatus(e.status))).toBe(true);
    expect(sj2Entries.every((e) => e.tglDatang === "2026-09-05")).toBe(true);

    // Pastikan seluruh baris Surat Jalan No 3 (138 barang) berstatus Datang dengan tglDatang 2026-10-24
    const sj3Entries = cache.entries.filter(
      (e) => e.sumber === "sj" && e.noSuratJalan === "3",
    );
    expect(sj3Entries).toHaveLength(138);
    expect(sj3Entries.every((e) => isArrivedStatus(e.status))).toBe(true);
    expect(sj3Entries.every((e) => e.tglDatang === "2026-10-24")).toBe(true);

    // Pastikan selectArrivalEntries mengembalikan 148 (SJ 1), 54 (SJ 2), 138 (SJ 3)
    const arrivalEntries = selectArrivalEntries(cache);
    const countByDate = new Map<string, number>();
    arrivalEntries.forEach((e) => {
      if (e.tglDatang) {
        countByDate.set(e.tglDatang, (countByDate.get(e.tglDatang) ?? 0) + 1);
      }
    });
    expect(countByDate.get("2026-07-28")).toBe(148);
    expect(countByDate.get("2026-09-05")).toBe(54);
    expect(countByDate.get("2026-10-24")).toBe(138);

    // Uji hook useSpbAnalytics menghasilkan titik timeline "Barang Datang" yang tepat
    const qc = createAppQueryClient();
    const { result } = renderHook(() => useSpbAnalytics(), {
      wrapper: createWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const barangDatangPoints = result.current.data!.lineData.filter(
      (p) => p.type === "Barang Datang",
    );
    const pointSj1 = barangDatangPoints.find((p) => p.rawDate === "2026-07-28");
    const pointSj2 = barangDatangPoints.find((p) => p.rawDate === "2026-09-05");
    const pointSj3 = barangDatangPoints.find((p) => p.rawDate === "2026-10-24");

    expect(pointSj1?.value).toBe(148);
    expect(pointSj2?.value).toBe(54);
    expect(pointSj3?.value).toBe(138);
  });

  it("5. Isolasi cache publik vs restricted serta pembersihan otomatis cache legacy v1", async () => {
    localStorage.setItem(
      "spb-status-cache:v1:public",
      JSON.stringify({ version: 1, scope: "public", savedAt: Date.now(), entries: [] }),
    );

    fakeDb.tables.spb = [
      { id: 1, no_spb: "1", nama_barang_spb: "Kabel", status: "sudah di proses" },
      { id: 2, no_spb: "2", nama_barang_spb: "Rahasia", status: "belum di proses" },
    ];

    const restrictedCache = await getSpbStatusCache({ canViewRestricted: true });
    expect(selectSpbOnlyEntries(restrictedCache)).toHaveLength(2);

    // Saat diakses sebagai user publik, cache restricted dihapus dan baris "belum di proses" disembunyikan
    const publicCache = await getSpbStatusCache({ canViewRestricted: false });
    expect(selectSpbOnlyEntries(publicCache)).toHaveLength(1);
    expect(localStorage.getItem("spb-status-cache:v1:public")).toBeNull();
    expect(localStorage.getItem("spb-status-cache:v2:restricted")).toBeNull();
  });
});

