import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { App as AntdApp, ConfigProvider } from "antd";
import type { ReactNode } from "react";

// Mock Supabase
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabaseClient: {
    from: vi.fn(() => ({ select: mockSelect })),
  },
}));

import { MonitoringSPBItemDetailPage } from "@/features/spb/pages/MonitoringSPBItemDetailPage";

function Wrapper({ children, route }: { children: ReactNode; route: string }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <ConfigProvider>
      <AntdApp>
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path="/monitoring-spb/item/:id" element={children} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

describe("MonitoringSPBItemDetailPage - Render Rincian (20 Baris)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("harus menampilkan 20 baris rincian dengan benar saat membuka item dari SPB (type=spb)", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 198,
        no_spb: "18 #R1",
        tgl_spb: "2026-08-18",
        nama_barang_spb: "Bola lampu sorot 100 Watt",
        ukuran: "100W",
        qty_permintaan: 2,
        satuan: "bh",
        merk: "Philips",
        spesifikasi_teknis: "IP65 Outdoor",
        lokasi_pemasangan: "Area Proyek",
        rencana_pemasangan: "Segera",
        po: {
          no_po: "36",
          tanggal_po: "2026-09-29",
          nama_supplier: "CV. Samudra Raya",
        },
        material_datang_tgl: "2026-10-05",
        material_datang_qty: 2,
        material_datang_satuan: "bh",
        keterangan: "Sesuai pesanan",
      },
      error: null,
    });

    const { container } = render(<MonitoringSPBItemDetailPage />, {
      wrapper: ({ children }) => (
        <Wrapper route="/monitoring-spb/item/198?type=spb">{children}</Wrapper>
      ),
    });

    await waitFor(() => {
      expect(screen.getByText("Bola lampu sorot 100 Watt")).toBeInTheDocument();
      expect(screen.getByText("36")).toBeInTheDocument();
      expect(screen.getByText("CV. Samudra Raya")).toBeInTheDocument();
      expect(screen.getByText("Datang Sesuai")).toBeInTheDocument();
    });

    // Pastikan tepat 20 baris rincian informasi ditampilkan
    const bodyRows = container.querySelectorAll(".ant-table-tbody tr.ant-table-row");
    expect(bodyRows).toHaveLength(20);

    // Pastikan semua label 20 baris tampil sesuai web produksi
    const expectedLabels = [
      "No SPB",
      "Tanggal SPB",
      "Nama Barang",
      "Ukuran",
      "Jumlah Permintaan",
      "Satuan",
      "No PO",
      "Tanggal PO",
      "Supplier",
      "Merk",
      "Spesifikasi Teknis",
      "Lokasi Pemasangan",
      "Rencana Pemasangan",
      "Tanggal Datang",
      "Qty Datang",
      "Satuan (Datang)",
      "Lama Proses",
      "Kurang/Lebih",
      "Keterangan",
      "Status",
    ];
    for (const label of expectedLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("harus menampilkan data dengan benar saat membuka item dari PO tanpa SPB (type=po)", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 152,
        no_po: "10 REV",
        tanggal_po: "2026-07-21",
        nama_barang_po: "Stang las karbit",
        material_datang_qty: 5,
        material_datang_satuan: "bh",
        material_datang_tgl: "2026-08-01",
        nama_supplier: "PT ABC",
      },
      error: null,
    });

    const { container } = render(<MonitoringSPBItemDetailPage />, {
      wrapper: ({ children }) => (
        <Wrapper route="/monitoring-spb/item/152?type=po">{children}</Wrapper>
      ),
    });

    await waitFor(() => {
      expect(screen.getByText("Stang las karbit")).toBeInTheDocument();
      expect(screen.getByText("10 REV")).toBeInTheDocument();
      const spbRow = screen.getByText("No SPB").closest("tr");
      expect(spbRow).toHaveTextContent("-");
    });

    const bodyRows = container.querySelectorAll(".ant-table-tbody tr.ant-table-row");
    expect(bodyRows).toHaveLength(20);
  });

  it("harus menampilkan data dengan benar saat membuka item Surat Jalan (type=sj)", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 4,
        no_surat_jalan: "3",
        nama_barang: "Lampu LED 15 Watt",
        material_datang_qty: 10,
        material_datang_tgl: "2026-10-20",
        spb: null,
        po: null,
      },
      error: null,
    });

    const { container } = render(<MonitoringSPBItemDetailPage />, {
      wrapper: ({ children }) => (
        <Wrapper route="/monitoring-spb/item/4?type=sj">{children}</Wrapper>
      ),
    });

    await waitFor(() => {
      expect(screen.getByText("Lampu LED 15 Watt")).toBeInTheDocument();
      expect(screen.getByText("Datang")).toBeInTheDocument();
      const sjRow = screen.getByText("No Surat Jalan").closest("tr");
      expect(sjRow).toHaveTextContent("3");
      // Surat Jalan murni: tidak punya SPB maupun PO
      expect(screen.getByText("No SPB").closest("tr")).toHaveTextContent("-");
      expect(screen.getByText("No PO").closest("tr")).toHaveTextContent("-");
    });

    const bodyRows = container.querySelectorAll(".ant-table-tbody tr.ant-table-row");
    expect(bodyRows).toHaveLength(20);
  });
});
