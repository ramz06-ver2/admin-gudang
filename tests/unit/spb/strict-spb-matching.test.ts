// tests/unit/spb/strict-spb-matching.test.ts
import React, { type ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { App as AntdApp, ConfigProvider } from "antd";

import { fetchDetailBySpb, validateStrictSpbRows } from "@/features/spb/api";
import { groupMonitoringData } from "@/features/spb/utils/groupMonitoringData";
import { MonitoringSPBDetailPage } from "@/features/spb/pages/MonitoringSPBDetailPage";

import tabelSpb from "../../../cjs/tabel_spb.json";
import tabelPo from "../../../cjs/tabel_po.json";
import tabelSuratJalan from "../../../cjs/tabel_surat_jalan.json";

const mockSelect = vi.fn();

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabaseClient: {
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  },
}));

function createTestWrapper(route: string) {
  return function TestWrapper({ children }: { children: ReactNode }) {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return React.createElement(
      ConfigProvider,
      null,
      React.createElement(
        AntdApp,
        null,
        React.createElement(
          QueryClientProvider,
          { client: qc },
          React.createElement(
            MemoryRouter,
            { initialEntries: [route] },
            React.createElement(
              Routes,
              null,
              React.createElement(Route, {
                path: "/monitoring-spb/detail",
                element: children,
              }),
            ),
          ),
        ),
      ),
    );
  };
}

describe("Strict SPB Matching & Validasi Tabel SPB (SPB 37)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Hanya mengembalikan data dari tabel spb jika nomor SPB dan judul SAMA PERSIS", async () => {
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValueOnce({
        data: [
          {
            id: 501,
            no_spb: "37",
            judul_spb: "AC&Alat kerja",
            nama_barang_spb: "Analizer",
            status: "sudah di proses",
          },
          {
            id: 517,
            no_spb: "37",
            judul_spb: "AC&Alat kerja",
            nama_barang_spb: "Kawat Las Perak",
            status: "sudah di proses",
          },
        ],
        error: null,
      }),
    });

    mockSelect.mockReturnValueOnce({
      in: vi.fn().mockResolvedValueOnce({
        data: [
          { id: 344, no_po: "59R1", id_spb: 501 },
          { id: 357, no_po: "64", id_spb: 517 },
        ],
        error: null,
      }),
    });

    const result = await fetchDetailBySpb("37", "AC&Alat kerja", true);

    expect(result).toHaveLength(2);
    expect(result.every((item) => item.sumber === "spb")).toBe(true);
    expect(result.every((item) => item.no_spb === "37")).toBe(true);
    expect(result.every((item) => item.judul_spb === "AC&Alat kerja")).toBe(
      true,
    );
    expect(result[result.length - 1].nama_barang).toBe("Kawat Las Perak");
  });

  it("SPB 37 pada data nyata (tabel_spb.json) hanya menampilkan 17 barang sampai 'Kawat Las Perak' tanpa duplikat dari surat_jalan maupun SPB 38", async () => {
    // 1. Verifikasi pada Card Monitoring SPB (groupMonitoringData)
    const cards = groupMonitoringData({
      allSpbData: tabelSpb as any[],
      poData: tabelPo as any[],
      sjData: tabelSuratJalan as any[],
      canViewRestricted: true,
      overrides: {},
    });

    const cardSpb37 = cards.find(
      (c) => c.spbNo === "37" && c.spbTitle === "AC&Alat kerja",
    );
    expect(cardSpb37).toBeDefined();
    expect(cardSpb37!.itemsCount).toBe(17);
    expect(cardSpb37!.itemNames).not.toContain("Tang Skun Manual"); // Milik SPB 38 yang judulnya sama ("AC&Alat kerja")

    // 2. Verifikasi pada Detail Card SPB 37 (fetchDetailBySpb)
    const spb37Rows = (tabelSpb as any[]).filter(
      (r) => String(r.no_spb).trim() === "37",
    );
    const spb37Ids = new Set(spb37Rows.map((r) => Number(r.id)));
    const poFor37 = (tabelPo as any[]).filter((p) =>
      spb37Ids.has(Number(p.id_spb)),
    );

    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValueOnce({
        data: spb37Rows,
        error: null,
      }),
    });
    mockSelect.mockReturnValueOnce({
      in: vi.fn().mockResolvedValueOnce({
        data: poFor37,
        error: null,
      }),
    });

    const detailItems = await fetchDetailBySpb("37", "AC&Alat kerja", true);

    expect(detailItems).toHaveLength(17);
    expect(detailItems[0].nama_barang).toBe("Analizer");
    expect(detailItems[16].nama_barang).toBe("Kawat Las Perak");
    expect(detailItems.every((item) => item.sumber === "spb")).toBe(true);
    expect(detailItems.every((item) => item.no_spb === "37")).toBe(true);
    expect(
      detailItems.every((item) => item.judul_spb === "AC&Alat kerja"),
    ).toBe(true);
  });

  it("MELEMPAR ERROR jika ada data dari NOMOR SPB LAIN tetapi JUDULNYA SAMA", async () => {
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValueOnce({
        data: [
          {
            id: 517,
            no_spb: "37",
            judul_spb: "AC&Alat kerja",
            nama_barang_spb: "Kawat Las Perak",
          },
          {
            id: 518,
            no_spb: "38",
            judul_spb: "AC&Alat kerja",
            nama_barang_spb: "Tang Skun Manual",
          },
        ],
        error: null,
      }),
    });

    await expect(fetchDetailBySpb("37", "AC&Alat kerja")).rejects.toThrow(
      /Data tidak konsisten: Ditemukan data dari nomor SPB lain \(38\) dengan judul yang sama \("AC&Alat kerja"\)/i,
    );
  });

  it("MELEMPAR ERROR jika NOMOR SPB SAMA tetapi ada JUDUL YANG BERBEDA di database", async () => {
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValueOnce({
        data: [
          {
            id: 1,
            no_spb: "37",
            judul_spb: "AC&Alat kerja",
            nama_barang_spb: "Kawat Las Perak",
          },
          {
            id: 2,
            no_spb: "37",
            judul_spb: "Judul Lain",
            nama_barang_spb: "Analizer",
          },
        ],
        error: null,
      }),
    });

    await expect(fetchDetailBySpb("37", "AC&Alat kerja")).rejects.toThrow(
      /Data tidak konsisten: SPB 37 memiliki lebih dari satu judul/i,
    );
  });

  it("MELEMPAR ERROR jika NOMOR SPB SAMA tetapi judul di database berbeda dengan judul yang diminta", async () => {
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValueOnce({
        data: [
          {
            id: 517,
            no_spb: "37",
            judul_spb: "AC&Alat kerja",
            nama_barang_spb: "Kawat Las Perak",
          },
        ],
        error: null,
      }),
    });

    await expect(fetchDetailBySpb("37", "Judul yang salah")).rejects.toThrow(
      /Data tidak konsisten: Nomor SPB 37 memiliki judul "AC&Alat kerja" yang berbeda dengan judul yang diminta \("Judul yang salah"\)/i,
    );
  });

  it("validateStrictSpbRows menolak baris yang bukan berasal dari tabel spb (mis. sumber: 'sj')", () => {
    expect(() =>
      validateStrictSpbRows(
        [
          {
            id: 313,
            sumber: "sj",
            no_spb: "37",
            judul_spb: "AC&Alat kerja",
            nama_barang: "Analizer",
          },
        ],
        "37",
        "AC&Alat kerja",
      ),
    ).toThrow(/bukan dari tabel SPB/i);
  });

  it("MonitoringSPBDetailPage menampilkan pesan error di UI saat terjadi konflik nomor/judul SPB", async () => {
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValueOnce({
        data: [
          {
            id: 517,
            no_spb: "37",
            judul_spb: "AC&Alat kerja",
            nama_barang_spb: "Kawat Las Perak",
          },
          {
            id: 518,
            no_spb: "38",
            judul_spb: "AC&Alat kerja",
            nama_barang_spb: "Tang Skun Manual",
          },
        ],
        error: null,
      }),
    });

    render(React.createElement(MonitoringSPBDetailPage), {
      wrapper: createTestWrapper(
        "/monitoring-spb/detail?spb=37&judul=AC%26Alat+kerja",
      ),
    });

    expect(await screen.findByText("Gagal memuat detail")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Data tidak konsisten: Ditemukan data dari nomor SPB lain \(38\) dengan judul yang sama/i,
      ),
    ).toBeInTheDocument();
  });
});
