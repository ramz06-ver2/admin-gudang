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

describe("MonitoringSPBItemDetailPage - Render Rincian", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("harus menampilkan data dengan benar saat membuka item dari SPB (type=spb)", async () => {
    // Mock data SPB
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 198,
        no_spb: "37",
        tgl_spb: "2026-09-21",
        nama_barang_spb: "Stang las karbit",
        qty_permintaan: 10,
        satuan: "bh",
        po: {
          no_po: "10 REV",
          tanggal_po: "2026-07-21",
          nama_supplier: "PT ABC",
        },
        material_datang_tgl: "2026-08-01",
        material_datang_qty: 10,
        material_datang_satuan: "bh",
      },
      error: null,
    });

    render(<MonitoringSPBItemDetailPage />, {
      wrapper: ({ children }) => (
        <Wrapper route="/monitoring-spb/item/198?type=spb">{children}</Wrapper>
      ),
    });

    await waitFor(() => {
      expect(screen.getByText("Stang las karbit")).toBeInTheDocument();
      expect(screen.getByText("10 REV")).toBeInTheDocument();
      expect(screen.getByText("Datang Sesuai")).toBeInTheDocument();
    });
  });

  it("harus menampilkan data dengan benar saat membuka item dari PO tanpa SPB (type=po)", async () => {
    // Mock data PO
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

    render(<MonitoringSPBItemDetailPage />, {
      wrapper: ({ children }) => (
        <Wrapper route="/monitoring-spb/item/152?type=po">{children}</Wrapper>
      ),
    });

    await waitFor(() => {
      expect(screen.getByText("Stang las karbit")).toBeInTheDocument();
      expect(screen.getByText("10 REV")).toBeInTheDocument();
      // Karena ini PO murni, kolom No SPB harus strip
      const spbRow = screen.getByText("No SPB").closest("tr");
      expect(spbRow).toHaveTextContent("-");
    });
  });
});
