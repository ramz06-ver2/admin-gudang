import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/shared/lib/supabaseClient", async () => {
  const m = await import("../../utils/fakeSupabase");
  return { supabaseClient: m.fakeSupabaseClient };
});

import { fakeDb } from "../../utils/fakeSupabase";
import { useMonitoringSPBDetail } from "@/features/spb/useMonitoringSPBDetail";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

/** Render hook, tunggu selesai loading, lalu kembalikan hasilnya. */
async function loadDetail(spb: string | null, po: string | null, sj: string | null = null) {
  const { result } = renderHook(() => useMonitoringSPBDetail(spb, po, sj), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result.current;
}

const names = (items: { nama_barang: string }[]) => items.map((i) => i.nama_barang);

beforeEach(() => {
  fakeDb.reset();
});

// ─────────────────────────────────────────────────────────────
describe("Detail card SPB", () => {
  it("menampilkan SEMUA barang SPB, baik yang sudah punya PO maupun belum", async () => {
    fakeDb.tables.spb = [
      { id: 1, no_spb: "63#R1", nama_barang_spb: "Barang A", qty_permintaan: 1, po: null },
      { id: 2, no_spb: "63#R1", nama_barang_spb: "Barang B", qty_permintaan: 1, po: { no_po: "PO-001", tanggal_po: "2026-01-01" } },
    ];

    const { items, error } = await loadDetail("63#R1", null);

    expect(error).toBeNull();
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ nama_barang: "Barang A", no_po: "-", status: "Belum PO", sumber: "spb" });
    expect(items[1]).toMatchObject({ nama_barang: "Barang B", no_po: "PO-001", status: "Sudah PO", sumber: "spb" });
  });

  it("hanya mengambil barang milik SPB yang diminta", async () => {
    fakeDb.tables.spb = [
      { id: 1, no_spb: "63#R1", nama_barang_spb: "Milik 63" },
      { id: 2, no_spb: "64", nama_barang_spb: "Milik 64" },
    ];

    const { items } = await loadDetail("63#R1", null);
    expect(names(items)).toEqual(["Milik 63"]);
  });

  it("menganggap no_po kosong, '-', dan 'null' sebagai TANPA PO, tetapi barangnya tetap tampil", async () => {
    fakeDb.tables.spb = [
      { id: 1, no_spb: "63#R1", nama_barang_spb: "A", po: { no_po: "", tanggal_po: "2026-01-01" } },
      { id: 2, no_spb: "63#R1", nama_barang_spb: "B", po: { no_po: "-", tanggal_po: "2026-01-01" } },
      { id: 3, no_spb: "63#R1", nama_barang_spb: "C", po: { no_po: "null", tanggal_po: "2026-01-01" } },
      { id: 4, no_spb: "63#R1", nama_barang_spb: "D", po: { no_po: "PO-123", tanggal_po: "2026-01-01" } },
    ];

    const { items } = await loadDetail("63#R1", null);

    expect(items).toHaveLength(4);
    expect(items.map((i) => i.no_po)).toEqual(["-", "-", "-", "PO-123"]);
    expect(items.map((i) => i.status)).toEqual(["Belum PO", "Belum PO", "Belum PO", "Sudah PO"]);
  });

  it("menghitung status kedatangan: sesuai / lebih / kurang", async () => {
    const base = { no_spb: "70", material_datang_tgl: "2026-10-01" };
    fakeDb.tables.spb = [
      { ...base, id: 1, nama_barang_spb: "Pas", qty_permintaan: 10, material_datang_qty: 10 },
      { ...base, id: 2, nama_barang_spb: "Lebih", qty_permintaan: 10, material_datang_qty: 12 },
      { ...base, id: 3, nama_barang_spb: "Kurang", qty_permintaan: 10, material_datang_qty: 4 },
    ];

    const { items } = await loadDetail("70", null);
    expect(items.map((i) => i.status)).toEqual(["Datang Sesuai", "Datang Lebih", "Datang Kurang"]);
  });

  it("memakai PO yang menunjuk SPB lewat po.id_spb bila spb.id_po kosong", async () => {
    fakeDb.tables.spb = [{ id: 7, no_spb: "80", nama_barang_spb: "Pipa", po: null }];
    fakeDb.tables.po = [{ id: 50, no_po: "PO-80", tanggal_po: "2026-02-02", id_spb: 7 }];

    const { items } = await loadDetail("80", null);
    expect(items[0]).toMatchObject({ no_po: "PO-80", status: "Sudah PO" });
  });

  it("menambahkan barang Surat Jalan (no 3+) yang punya id_spb ke card SPB, SJ no 1 & 2 diabaikan", async () => {
    fakeDb.tables.spb = [{ id: 1, no_spb: "63#R1", nama_barang_spb: "Barang SPB" }];
    fakeDb.tables.surat_jalan = [
      { id: 10, no_surat_jalan: "1", id_spb: 1, nama_barang: "SJ 1 (diabaikan)" },
      { id: 11, no_surat_jalan: "2", id_spb: 1, nama_barang: "SJ 2 (diabaikan)" },
      { id: 12, no_surat_jalan: "3", id_spb: 1, nama_barang: "SJ 3 masuk SPB", spb: { no_spb: "63#R1" } },
      { id: 13, no_surat_jalan: "12", id_spb: 1, nama_barang: "SJ 12 masuk SPB" },
    ];

    const { items } = await loadDetail("63#R1", null);

    expect(names(items)).toEqual(["Barang SPB", "SJ 3 masuk SPB", "SJ 12 masuk SPB"]);
    expect(items.map((i) => i.sumber)).toEqual(["spb", "sj", "sj"]);
    expect(items[1].no_spb).toBe("63#R1");
  });

  it("tidak menampilkan Surat Jalan milik SPB lain", async () => {
    fakeDb.tables.spb = [
      { id: 1, no_spb: "63#R1", nama_barang_spb: "A" },
      { id: 2, no_spb: "64", nama_barang_spb: "B" },
    ];
    fakeDb.tables.surat_jalan = [
      { id: 20, no_surat_jalan: "5", id_spb: 2, nama_barang: "SJ milik SPB 64" },
    ];

    const { items } = await loadDetail("63#R1", null);
    expect(names(items)).toEqual(["A"]);
  });

  it("memberi key unik walau id SPB dan id SJ sama", async () => {
    fakeDb.tables.spb = [{ id: 1, no_spb: "63#R1", nama_barang_spb: "A" }];
    fakeDb.tables.surat_jalan = [{ id: 1, no_surat_jalan: "3", id_spb: 1, nama_barang: "B" }];

    const { items } = await loadDetail("63#R1", null);
    expect(new Set(items.map((i) => i.key)).size).toBe(2);
  });

  it("mengembalikan array kosong jika SPB tidak ditemukan", async () => {
    const { items, error } = await loadDetail("TIDAK-ADA", null);
    expect(items).toEqual([]);
    expect(error).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
describe("Detail card PO (tanpa SPB)", () => {
  it("menampilkan barang PO yang tidak terhubung ke SPB + Surat Jalan yang hanya punya id_po", async () => {
    fakeDb.tables.po = [
      { id: 100, no_po: "34", id_spb: null, nama_barang_po: "Besi 10mm" },
      { id: 101, no_po: "34", id_spb: null, nama_barang_po: "Besi 12mm" },
    ];
    fakeDb.tables.surat_jalan = [
      { id: 30, no_surat_jalan: "4", id_spb: null, id_po: 100, nama_barang: "SJ 4 untuk PO 34", po: { no_po: "34" } },
    ];

    const { items } = await loadDetail(null, "34");

    expect(names(items)).toEqual(["Besi 10mm", "Besi 12mm", "SJ 4 untuk PO 34"]);
    expect(items.map((i) => i.sumber)).toEqual(["po", "po", "sj"]);
    expect(items.every((i) => i.no_po === "34")).toBe(true);
  });

  it("TIDAK menampilkan barang yang sudah muncul di card SPB", async () => {
    fakeDb.tables.spb = [
      { id: 1, no_spb: "63#R1", id_po: null, nama_barang_spb: "Barang SPB" },
      { id: 2, no_spb: "63#R1", id_po: 201, nama_barang_spb: "Barang SPB kedua" },
    ];
    fakeDb.tables.po = [
      { id: 200, no_po: "50", id_spb: 1, nama_barang_po: "PO terhubung lewat po.id_spb" },
      { id: 201, no_po: "50", id_spb: null, nama_barang_po: "PO terhubung lewat spb.id_po" },
      { id: 202, no_po: "50", id_spb: null, nama_barang_po: "PO murni" },
    ];
    fakeDb.tables.surat_jalan = [
      { id: 40, no_surat_jalan: "6", id_spb: 1, id_po: 200, nama_barang: "SJ punya id_spb (masuk card SPB)" },
      { id: 41, no_surat_jalan: "7", id_spb: null, id_po: 202, nama_barang: "SJ hanya id_po" },
    ];

    const { items } = await loadDetail(null, "50");
    expect(names(items)).toEqual(["PO murni", "SJ hanya id_po"]);
  });

  it("mengabaikan Surat Jalan no 1 dan 2", async () => {
    fakeDb.tables.po = [{ id: 100, no_po: "34", id_spb: null, nama_barang_po: "Besi" }];
    fakeDb.tables.surat_jalan = [
      { id: 50, no_surat_jalan: "1", id_po: 100, id_spb: null, nama_barang: "SJ 1" },
      { id: 51, no_surat_jalan: "2", id_po: 100, id_spb: null, nama_barang: "SJ 2" },
    ];

    const { items } = await loadDetail(null, "34");
    expect(names(items)).toEqual(["Besi"]);
  });

  it("mengembalikan array kosong jika PO tidak ditemukan", async () => {
    expect((await loadDetail(null, "999")).items).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
describe("Detail card Surat Jalan murni (tanpa id_spb dan id_po)", () => {
  it("menampilkan hanya barang dari SJ tersebut yang tidak punya id_spb maupun id_po", async () => {
    fakeDb.tables.surat_jalan = [
      { id: 3, no_surat_jalan: "3", id_spb: null, id_po: null, nama_barang: "Kabel Roll 100m", material_datang_qty: 2, material_datang_tgl: "2026-10-20" },
      { id: 4, no_surat_jalan: "3", id_spb: null, id_po: null, nama_barang: "Lampu LED 15 Watt", material_datang_qty: 10, material_datang_tgl: "2026-10-20" },
      { id: 5, no_surat_jalan: "3", id_spb: 9, id_po: null, nama_barang: "SJ 3 tapi punya SPB (card SPB)" },
      { id: 6, no_surat_jalan: "3", id_spb: null, id_po: 8, nama_barang: "SJ 3 tapi punya PO (card PO)" },
      { id: 7, no_surat_jalan: "4", id_spb: null, id_po: null, nama_barang: "SJ lain" },
    ];

    const { items } = await loadDetail(null, null, "3");

    expect(names(items)).toEqual(["Kabel Roll 100m", "Lampu LED 15 Watt"]);
    expect(items[0]).toMatchObject({ sumber: "sj", status: "Datang", qty_datang: 2, no_spb: "-", no_po: "-" });
  });

  it.each(["1", "2"])("Surat Jalan no %s diabaikan: hasil kosong dan tanpa query ke DB", async (no) => {
    fakeDb.tables.surat_jalan = [
      { id: 1, no_surat_jalan: no, id_spb: null, id_po: null, nama_barang: "Data lama" },
    ];

    const { items } = await loadDetail(null, null, no);

    expect(items).toEqual([]);
    expect(fakeDb.queriesTo("surat_jalan")).toBe(0);
  });

  it("status 'Belum Datang' jika material_datang_tgl kosong", async () => {
    fakeDb.tables.surat_jalan = [
      { id: 1, no_surat_jalan: "5", id_spb: null, id_po: null, nama_barang: "Semen" },
    ];
    const { items } = await loadDetail(null, null, "5");
    expect(items[0].status).toBe("Belum Datang");
  });
});

// ─────────────────────────────────────────────────────────────
describe("Perilaku umum hook", () => {
  it("tanpa parameter apa pun: tidak melakukan query dan mengembalikan []", async () => {
    const { result } = renderHook(() => useMonitoringSPBDetail(null, null, null), { wrapper });

    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(fakeDb.calls).toHaveLength(0);
  });

  it("meneruskan error dari Supabase ke pemanggil", async () => {
    fakeDb.errors.spb = { message: "koneksi gagal" };

    const { items, error } = await loadDetail("63#R1", null);

    expect(items).toEqual([]);
    expect(error).toMatchObject({ message: "koneksi gagal" });
  });
});