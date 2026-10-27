import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp, ConfigProvider } from "antd";
import type { ReactNode } from "react";

vi.mock("@/features/spb/useMonitoringSPB", () => ({
  useMonitoringSPB: vi.fn(),
}));

import { useMonitoringSPB } from "@/features/spb/useMonitoringSPB";
import MonitoringSPBPage from "@/features/spb/pages/MonitoringSPBPage";

const mockUseMonitoringSPB = vi.mocked(useMonitoringSPB);

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <ConfigProvider>
      <AntdApp>
        <QueryClientProvider client={qc}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

// ✅ Perbaikan Mock Data agar konsisten dengan UI
const mockData = [
  {
    id: "SPB_1",
    spbNo: "SPB-01",
    spbTitle: "Proyek A",
    poNo: null, // ✅ Belum PO harusnya null
    suratJalanNo: null,
    date: "2026-10-20",
    itemsCount: 5,
    sortNumber: 1,
    status: "Belum PO",
    itemNames: ["Semen", "Pasir"],
  },
  {
    id: "PO_2",
    spbNo: null,
    spbTitle: null,
    poNo: "PO-02",
    suratJalanNo: null,
    date: "2026-10-21",
    itemsCount: 3,
    sortNumber: 2,
    status: "Sudah PO",
    itemNames: ["Besi"],
  },
  {
    id: "SJ_3",
    spbNo: null,
    spbTitle: null,
    poNo: null,
    suratJalanNo: 3 as any,
    date: "2026-10-22",
    itemsCount: 1,
    sortNumber: 3,
    status: "Selesai",
    itemNames: ["Cat"],
  },
];

describe("MonitoringSPBPage - Fitur Pencarian, Filter, dan Sorting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMonitoringSPB.mockReturnValue({
      data: mockData as any,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("tidak boleh crash saat mencari suratJalanNo yang bertipe Number", () => {
    render(<MonitoringSPBPage />, { wrapper: Wrapper });
    const searchInput = screen.getByPlaceholderText(/Cari No SPB/i);
    fireEvent.change(searchInput, { target: { value: "3" } });

    // Card SJ besar harus muncul dengan teks "No. Surat Jalan"
    expect(screen.getByText("No. Surat Jalan")).toBeInTheDocument();
  });

  it("bisa mencari berdasarkan Nama Barang", () => {
    render(<MonitoringSPBPage />, { wrapper: Wrapper });

    // ✅ Gunakan aria-label yang baru ditambahkan di komponen
    const modeSelect = screen.getByLabelText("Mode Pencarian");
    fireEvent.mouseDown(modeSelect);

    // Pilih "Nama Barang"
    fireEvent.click(screen.getByText("Nama Barang"));

    const searchInput = screen.getByPlaceholderText(/Cari Nama Barang/i);
    fireEvent.change(searchInput, { target: { value: "Semen" } });

    // Pastikan SPB-01 ada, PO-02 dan SJ-3 hilang
    expect(screen.getByText(/SPB: SPB-01/i)).toBeInTheDocument();
    expect(screen.queryByText(/PO: PO-02/i)).not.toBeInTheDocument();
  });

  it("bisa memfilter status 'Sudah PO'", () => {
    render(<MonitoringSPBPage />, { wrapper: Wrapper });

    fireEvent.click(screen.getByText("Sudah PO"));

    // Hanya card PO-02 yang muncul
    expect(screen.getByText(/PO: PO-02/i)).toBeInTheDocument();
    expect(screen.queryByText(/SPB: SPB-01/i)).not.toBeInTheDocument();
  });

  it("bisa mengurutkan berdasarkan 'Paling Baru'", () => {
    render(<MonitoringSPBPage />, { wrapper: Wrapper });

    // ✅ Gunakan aria-label yang baru ditambahkan di komponen
    const sortSelect = screen.getByLabelText("Urutan Data");
    fireEvent.mouseDown(sortSelect);
    fireEvent.click(screen.getByText("Urut: Paling Baru"));

    // SJ_3 (2026-10-22) harus berada di urutan pertama
    const cards = screen.getAllByText(/Total:/i);
    // ✅ Di Card Besar teksnya adalah "No. Surat Jalan" bukan "SJ:"
    expect(cards[0].closest(".ant-card")).toHaveTextContent("No. Surat Jalan3");
  });
});
