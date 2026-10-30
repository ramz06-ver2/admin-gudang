import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/shared/lib/supabaseClient", async () => {
  const m = await import("../../utils/fakeSupabase");
  return { supabaseClient: m.fakeSupabaseClient };
});

import { fakeDb } from "../../utils/fakeSupabase";
import { useMonitoringSPB } from "@/features/spb/useMonitoringSPB";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

async function loadCards() {
  const { result } = renderHook(() => useMonitoringSPB(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result.current.data;
}

beforeEach(() => {
  fakeDb.reset();
});

describe("useMonitoringSPB - PO tanpa SPB", () => {
  it("menggabungkan 42 barang dengan No PO 34 menjadi 1 card", async () => {
    fakeDb.tables.po = Array.from({ length: 42 }, (_, i) => ({
      id: 100 + i,
      no_po: "34",
      tanggal_po: "2026-08-21",
      id_spb: null,
      material_datang_tgl: null,
      material_datang_qty: 0,
    }));

    const cards = await loadCards();

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ poNo: "34", itemsCount: 42, status: "Sudah PO", spbNo: null });
  });

  it("PO yang sudah terhubung ke SPB tidak membuat card PO sendiri", async () => {
    fakeDb.tables.spb = [{ id: 1, no_spb: "63#R1", judul_spb: "Listrik", tgl_spb: "2026-09-01", id_po: 10, po: { no_po: "50", tanggal_po: "2026-09-02" } }];
    fakeDb.tables.po = [{ id: 10, no_po: "50", tanggal_po: "2026-09-02", id_spb: 1 }];

    const cards = await loadCards();

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ spbNo: "63#R1", poNo: "50", itemsCount: 1 });
  });
});

describe("useMonitoringSPB - penempatan Surat Jalan (no 3 dst)", () => {
  it("Surat Jalan no 1 dan 2 diabaikan sepenuhnya (tidak membuat card)", async () => {
    fakeDb.tables.surat_jalan = [
      { id: 1, no_surat_jalan: "1", id_spb: null, id_po: null, nama_barang: "Lama 1" },
      { id: 2, no_surat_jalan: "2", id_spb: null, id_po: null, nama_barang: "Lama 2" },
      { id: 3, no_surat_jalan: 2, id_spb: 5, id_po: null, nama_barang: "Lama 2 (number)", spb: { no_spb: "63#R1" } },
    ];

    expect(await loadCards()).toEqual([]);
  });

  it("punya id_spb -> masuk ke card SPB, tidak membuat card terpisah", async () => {
    fakeDb.tables.spb = [{ id: 1, no_spb: "63#R1", judul_spb: "Listrik", tgl_spb: "2026-09-01", nama_barang_spb: "Kabel" }];
    fakeDb.tables.surat_jalan = [
      { id: 10, no_surat_jalan: "3", id_spb: 1, id_po: null, nama_barang: "Kabel NYM", spb: { no_spb: "63#R1", judul_spb: "Listrik" } },
    ];

    const cards = await loadCards();

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ id: "63#R1", spbNo: "63#R1", itemsCount: 2 });
    expect(cards[0].itemNames).toEqual(expect.arrayContaining(["Kabel", "Kabel NYM"]));
  });

  it("tanpa id_spb tetapi punya id_po -> masuk ke card PO", async () => {
    fakeDb.tables.po = [{ id: 100, no_po: "34", tanggal_po: "2026-08-21", id_spb: null, nama_barang_po: "Besi" }];
    fakeDb.tables.surat_jalan = [
      { id: 11, no_surat_jalan: "4", id_spb: null, id_po: 100, nama_barang: "Besi 8mm", po: { no_po: "34" } },
    ];

    const cards = await loadCards();

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ id: "PO_34", poNo: "34", spbNo: null, itemsCount: 2 });
  });

  it("SJ dengan id_po yang PO-nya terhubung ke SPB tetap tampil di card PO (bukan card SJ)", async () => {
    fakeDb.tables.spb = [{ id: 1, no_spb: "63#R1", id_po: 10, po: { no_po: "50", tanggal_po: "2026-09-02" }, nama_barang_spb: "Pipa" }];
    fakeDb.tables.po = [{ id: 10, no_po: "50", id_spb: 1, tanggal_po: "2026-09-02" }];
    fakeDb.tables.surat_jalan = [
      { id: 12, no_surat_jalan: "5", id_spb: null, id_po: 10, nama_barang: "Pipa PVC", po: { no_po: "50" } },
    ];

    const cards = await loadCards();
    const poCard = cards.find((c) => c.id === "PO_50");

    expect(poCard).toBeDefined();
    expect(poCard).toMatchObject({ poNo: "50", spbNo: null, itemsCount: 1 });
    // card tersebut harus dikenali sebagai card PO, bukan card Surat Jalan
    expect(poCard!.suratJalanNo ?? null).toBeNull();
  });

  it("tanpa id_spb dan id_po -> card Surat Jalan; beberapa barang SJ yang sama digabung", async () => {
    fakeDb.tables.surat_jalan = [
      { id: 20, no_surat_jalan: "3", id_spb: null, id_po: null, nama_barang: "Kabel Roll 100m", material_datang_tgl: "2026-10-20", material_datang_qty: 2 },
      { id: 21, no_surat_jalan: "3", id_spb: null, id_po: null, nama_barang: "Lampu LED 15 Watt", material_datang_tgl: "2026-10-20", material_datang_qty: 10 },
      { id: 22, no_surat_jalan: "4", id_spb: null, id_po: null, nama_barang: "Semen" },
    ];

    const cards = await loadCards();
    const sj3 = cards.find((c) => c.id === "SJ_3");
    const sj4 = cards.find((c) => c.id === "SJ_4");

    expect(cards).toHaveLength(2);
    expect(sj3).toMatchObject({ suratJalanNo: "3", spbNo: null, poNo: null, itemsCount: 2, status: "Selesai" });
    expect(sj4).toMatchObject({ suratJalanNo: "4", itemsCount: 1, status: "Sudah PO" });
  });

  it("satu barang tidak muncul di dua card sekaligus", async () => {
    fakeDb.tables.spb = [{ id: 1, no_spb: "63#R1", nama_barang_spb: "A" }];
    fakeDb.tables.po = [{ id: 100, no_po: "34", id_spb: null, nama_barang_po: "B" }];
    fakeDb.tables.surat_jalan = [
      { id: 30, no_surat_jalan: "3", id_spb: 1, id_po: 100, nama_barang: "Ke SPB", spb: { no_spb: "63#R1" }, po: { no_po: "34" } },
      { id: 31, no_surat_jalan: "3", id_spb: null, id_po: 100, nama_barang: "Ke PO", po: { no_po: "34" } },
      { id: 32, no_surat_jalan: "3", id_spb: null, id_po: null, nama_barang: "Ke SJ" },
    ];

    const cards = await loadCards();
    const total = cards.reduce((sum, c) => sum + c.itemsCount, 0);

    // 1 SPB + 1 PO + 3 SJ, masing-masing dihitung tepat satu kali
    expect(total).toBe(5);
    expect(cards.find((c) => c.id === "63#R1")!.itemsCount).toBe(2);
    expect(cards.find((c) => c.id === "PO_34")!.itemsCount).toBe(2);
    expect(cards.find((c) => c.id === "SJ_3")!.itemsCount).toBe(1);
  });
});