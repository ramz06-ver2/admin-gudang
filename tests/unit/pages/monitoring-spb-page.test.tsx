import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp, ConfigProvider } from "antd";
import type { ReactNode } from "react";

// Mock Hook
vi.mock("@/features/spb/useMonitoringSPB", () => ({
  useMonitoringSPB: vi.fn(),
  updateDocumentTitle: vi.fn().mockResolvedValue(undefined),
}));

import { useMonitoringSPB, updateDocumentTitle } from "@/features/spb/useMonitoringSPB";
import MonitoringSPBPage from "@/features/spb/pages/MonitoringSPBPage";

const mockUseMonitoringSPB = vi.mocked(useMonitoringSPB);
const mockUpdateDocumentTitle = vi.mocked(updateDocumentTitle);

// Wrapper untuk Antd & React Query
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

// Mock Data mencakup SPB tanpa PO yang statusnya Belum PO, Datang, dan Selesai
const mockData = [
  {
    id: "SPB_1",
    spbNo: "SPB-01",
    spbTitle: "Proyek A",
    poNo: null,
    poTitle: null,
    suratJalanNo: null,
    date: "2026-10-20",
    itemsCount: 5,
    sortNumber: 1,
    status: "Belum PO",
    itemNames: ["Semen", "Pasir"],
  },
  {
    id: "SPB_1A",
    spbNo: "1A",
    spbTitle: "Material Office & Gudang Proyek",
    poNo: null,
    poTitle: null,
    suratJalanNo: null,
    date: "2026-08-01",
    itemsCount: 18,
    sortNumber: 1,
    status: "Datang",
    itemNames: ["Printer"],
  },
  {
    id: "SPB_29",
    spbNo: "29",
    spbTitle: "Drain AC Wellnes & Vanna",
    poNo: null,
    poTitle: null,
    suratJalanNo: null,
    date: "2026-10-12",
    itemsCount: 3,
    sortNumber: 29,
    status: "Selesai",
    itemNames: ["Pipa Drain"],
  },
  {
    id: "PO_2",
    spbNo: null,
    spbTitle: null,
    poNo: "PO-02",
    poTitle: "Besi Utama",
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
    poTitle: null,
    suratJalanNo: 3 as any,
    date: "2026-10-22",
    itemsCount: 1,
    sortNumber: 3,
    status: "Selesai",
    itemNames: ["Cat"],
  },
];

describe("MonitoringSPBPage - Fitur Pencarian, Filter, Sorting, dan Edit Judul", () => {
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

    expect(screen.getByText("No. Surat Jalan")).toBeInTheDocument();
  });

  it("bisa mencari berdasarkan Nama Barang", () => {
    render(<MonitoringSPBPage />, { wrapper: Wrapper });

    const modeSelect = document.querySelector(
      '.ant-select[aria-label="Mode Pencarian"] .ant-select-selector',
    )!;
    fireEvent.mouseDown(modeSelect);
    fireEvent.click(screen.getByText("Nama Barang"));

    const searchInput = screen.getByPlaceholderText(/Cari Nama Barang/i);
    fireEvent.change(searchInput, { target: { value: "Semen" } });

    const mainGrid = document.querySelector(".ant-row") as HTMLElement;

    expect(within(mainGrid).getByText("SPB-01")).toBeInTheDocument();
    expect(within(mainGrid).queryByText("PO-02")).not.toBeInTheDocument();
  });

  it("bisa memfilter status 'Sudah di PO'", () => {
    render(<MonitoringSPBPage />, { wrapper: Wrapper });

    const segmentedFilter = document.querySelector(".ant-segmented") as HTMLElement;
    const filterOption = within(segmentedFilter).getByText("Sudah di PO");
    fireEvent.click(filterOption);

    const mainGrid = document.querySelector(".ant-row") as HTMLElement;

    expect(within(mainGrid).getByText("PO-02")).toBeInTheDocument();
    expect(within(mainGrid).queryByText("SPB-01")).not.toBeInTheDocument();
  });

  it("PERBAIKAN BUG: filter 'Belum di PO' TIDAK menampilkan card berstatus 'Datang' atau 'Selesai'", () => {
    render(<MonitoringSPBPage />, { wrapper: Wrapper });

    const segmentedFilter = document.querySelector(".ant-segmented") as HTMLElement;
    const filterOption = within(segmentedFilter).getByText("Belum di PO");
    fireEvent.click(filterOption);

    const mainGrid = document.querySelector(".ant-row") as HTMLElement;

    // Hanya SPB-01 (status "Belum PO") yang boleh muncul
    expect(within(mainGrid).getByText("SPB-01")).toBeInTheDocument();

    // SPB 1A (status "Datang"), SPB 29 (status "Selesai"), dan SJ 3 (status "Selesai") TIDAK boleh muncul!
    expect(within(mainGrid).queryByText("1A")).not.toBeInTheDocument();
    expect(within(mainGrid).queryByText("29")).not.toBeInTheDocument();
    expect(within(mainGrid).queryByText("Datang")).not.toBeInTheDocument();
    expect(within(mainGrid).queryByText("Selesai")).not.toBeInTheDocument();
  });

  it("bisa mengurutkan berdasarkan 'Paling Baru'", () => {
    render(<MonitoringSPBPage />, { wrapper: Wrapper });

    const sortSelect = document.querySelector(
      '.ant-select[aria-label="Urutan Data"] .ant-select-selector',
    )!;
    fireEvent.mouseDown(sortSelect);
    fireEvent.click(screen.getByText("Urut: Paling Baru"));

    const bigCards = document.querySelectorAll(".ant-col .ant-card");
    expect(bigCards[0]).toHaveTextContent("No. Surat Jalan");
    expect(bigCards[0]).toHaveTextContent("3");
  });

  it("menampilkan ikon pensil kecil pada card SPB dan PO serta dapat mengedit judulnya", async () => {
    render(<MonitoringSPBPage />, { wrapper: Wrapper });

    // Tombol pensil di card SPB-01 dan PO-02 harus ada
    const editSpbBtn = screen.getByTestId("edit-spb-title-SPB-01");
    const editPoBtn = screen.getByTestId("edit-po-title-PO-02");
    expect(editSpbBtn).toBeInTheDocument();
    expect(editPoBtn).toBeInTheDocument();

    // Klik ikon pensil pada SPB-01
    fireEvent.click(editSpbBtn);

    const input = await screen.findByLabelText("Input Judul Dokumen");
    expect(input).toHaveValue("Proyek A");

    fireEvent.change(input, { target: { value: "Proyek Renovasi Villa" } });
    fireEvent.click(screen.getByRole("button", { name: /simpan/i }));

    await waitFor(() => {
      expect(mockUpdateDocumentTitle).toHaveBeenCalledWith(
        "spb",
        "SPB-01",
        "Proyek Renovasi Villa",
      );
      expect(screen.getByText(/- Proyek Renovasi Villa/)).toBeInTheDocument();
    });
  });
});
