import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { App as AntdApp, ConfigProvider } from "antd";
import type { ReactNode } from "react";

vi.mock("@/shared/lib/supabaseClient", async () => {
  const m = await import("../../utils/fakeSupabase");
  return { supabaseClient: m.fakeSupabaseClient };
});

import { fakeDb } from "../../utils/fakeSupabase";
import { MonitoringSPBDetailPage } from "@/features/spb/pages/MonitoringSPBDetailPage";

/** Menampilkan URL tujuan navigasi agar bisa dicek di test. */
function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname + loc.search}</div>;
}

function Wrapper({ children, route }: { children: ReactNode; route: string }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <ConfigProvider>
      <AntdApp>
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path="/monitoring-spb/detail" element={children} />
              <Route path="/monitoring-spb/item/:id" element={<LocationProbe />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

const renderAt = (route: string) =>
  render(<MonitoringSPBDetailPage />, {
    wrapper: ({ children }) => <Wrapper route={route}>{children}</Wrapper>,
  });

beforeEach(() => {
  fakeDb.reset();
});

describe("MonitoringSPBDetailPage - Surat Jalan murni (SJ 3)", () => {
  beforeEach(() => {
    fakeDb.tables.surat_jalan = [
      { id: 3, no_surat_jalan: "3", id_spb: null, id_po: null, nama_barang: "Kabel Roll 100m", material_datang_qty: 2, material_datang_tgl: "2026-10-20" },
      { id: 4, no_surat_jalan: "3", id_spb: null, id_po: null, nama_barang: "Lampu LED 15 Watt", material_datang_qty: 10, material_datang_tgl: "2026-10-20" },
      // tidak boleh tampil di card SJ murni:
      { id: 5, no_surat_jalan: "3", id_spb: 9, id_po: null, nama_barang: "Milik card SPB" },
      { id: 6, no_surat_jalan: "3", id_spb: null, id_po: 8, nama_barang: "Milik card PO" },
    ];
  });

  it("menampilkan tabel barang dari Surat Jalan no 3 murni", async () => {
    renderAt("/monitoring-spb/detail?sj=3");

    // Header sudah tampil selagi loading, jadi tunggu judul tabel (baru ada setelah data masuk).
    expect(await screen.findByText("Daftar Barang (2)", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText(/Surat Jalan:\s*3/i)).toBeInTheDocument();
    expect(screen.getByText("Kabel Roll 100m")).toBeInTheDocument();
    expect(screen.getByText("Lampu LED 15 Watt")).toBeInTheDocument();
  });

  it("tidak menampilkan barang yang menjadi milik card SPB / PO", async () => {
    renderAt("/monitoring-spb/detail?sj=3");

    await screen.findByText("Daftar Barang (2)");
    expect(screen.queryByText("Milik card SPB")).not.toBeInTheDocument();
    expect(screen.queryByText("Milik card PO")).not.toBeInTheDocument();
  });

  it("tidak menampilkan kartu status PO untuk Surat Jalan murni", async () => {
    renderAt("/monitoring-spb/detail?sj=3");

    await screen.findByText("Daftar Barang (2)");
    expect(screen.queryByText("Belum di PO")).not.toBeInTheDocument();
    expect(screen.queryByText("Sudah di PO")).not.toBeInTheDocument();
  });

  it("tombol Detail membuka rincian barang dengan type=sj", async () => {
    renderAt("/monitoring-spb/detail?sj=3");

    const row = (await screen.findByText("Lampu LED 15 Watt")).closest("tr") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: /detail/i }));

    expect(await screen.findByTestId("location")).toHaveTextContent("/monitoring-spb/item/4?type=sj");
  });

  it("Surat Jalan no 1 menampilkan 'dokumen tidak ditemukan'", async () => {
    fakeDb.tables.surat_jalan = [
      { id: 1, no_surat_jalan: "1", id_spb: null, id_po: null, nama_barang: "Data lama" },
    ];
    renderAt("/monitoring-spb/detail?sj=1");

    expect(await screen.findByText(/Dokumen tidak ditemukan/i)).toBeInTheDocument();
    expect(screen.queryByText("Data lama")).not.toBeInTheDocument();
  });
});

describe("MonitoringSPBDetailPage - card SPB dan PO", () => {
  it("card SPB: barang SPB + barang Surat Jalan (no 3+) milik SPB tersebut", async () => {
    fakeDb.tables.spb = [
      { id: 1, no_spb: "63#R1", judul_spb: "Listrik Gudang", nama_barang_spb: "Kabel NYM", qty_permintaan: 5, satuan: "roll", po: null },
    ];
    fakeDb.tables.surat_jalan = [
      { id: 1, no_surat_jalan: "3", id_spb: 1, nama_barang: "Stop kontak" },
      { id: 2, no_surat_jalan: "2", id_spb: 1, nama_barang: "SJ 2 diabaikan" },
    ];

    renderAt("/monitoring-spb/detail?spb=63%23R1");

    expect(await screen.findByText("Daftar Barang (2)")).toBeInTheDocument();
    expect(screen.getByText("Kabel NYM")).toBeInTheDocument();
    expect(screen.getByText("Stop kontak")).toBeInTheDocument();
    expect(screen.queryByText("SJ 2 diabaikan")).not.toBeInTheDocument();
    expect(screen.getByText("Belum di PO")).toBeInTheDocument();
  });

  it("card PO: hanya barang PO yang belum masuk SPB + Surat Jalan yang hanya punya id_po", async () => {
    fakeDb.tables.po = [
      { id: 100, no_po: "34", id_spb: null, nama_barang_po: "Besi 10mm" },
    ];
    fakeDb.tables.surat_jalan = [
      { id: 7, no_surat_jalan: "4", id_spb: null, id_po: 100, nama_barang: "Besi 12mm", po: { no_po: "34" } },
    ];

    renderAt("/monitoring-spb/detail?po=34");

    expect(await screen.findByText("Daftar Barang (2)")).toBeInTheDocument();
    expect(screen.getByText("Besi 10mm")).toBeInTheDocument();
    expect(screen.getByText("Besi 12mm")).toBeInTheDocument();
    expect(screen.getByText("Sudah di PO")).toBeInTheDocument();
  });
});