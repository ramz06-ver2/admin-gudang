import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp, ConfigProvider } from "antd";
import type { ReactNode } from "react";

// ============================================
// Mock hook
// ============================================
vi.mock("@/hooks/useMonitoringSPB", () => ({
  useMonitoringSPB: vi.fn(),
}));

import { useMonitoringSPB } from "@/hooks/useMonitoringSPB";
import { MonitoringSPBPage } from "@/pages/monitoring-spb";
import type { SPBDocumentGroup } from "@/hooks/useMonitoringSPB";

const mockUseMonitoringSPB = vi.mocked(useMonitoringSPB);

// ============================================
// Wrapper
// ============================================
function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#1677ff" } }}>
      <AntdApp>
        <QueryClientProvider client={qc}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

function renderPage() {
  return render(<MonitoringSPBPage />, { wrapper: Wrapper });
}

// ============================================
// Sample data
// ============================================
const sampleData: SPBDocumentGroup[] = [
  {
    id: "SPB-001_PO-001",
    spbNo: "SPB-001",
    poNo: "PO-001",
    date: "2024-01-01",
    status: "BELUM DATANG",
    itemsCount: 2,
    sortNumber: 1.01,
  },
  {
    id: "SPB-002_PO-002",
    spbNo: "SPB-002",
    poNo: "PO-002",
    date: "2024-01-02",
    status: "DATANG SESUAI",
    itemsCount: 1,
    sortNumber: 2.02,
  },
  {
    id: "SPB-003_NO_PO",
    spbNo: "SPB-003",
    poNo: null,
    date: "2024-01-03",
    status: "BELUM DATANG",
    itemsCount: 3,
    sortNumber: 10002.99,
  },
  {
    id: "SPB-004_PO-003",
    spbNo: "SPB-004",
    poNo: "PO-003",
    date: "2024-01-04",
    status: "DATANG LEBIH",
    itemsCount: 1,
    sortNumber: 4.03,
  },
];

// Helper: hitung card di grid utama (bukan "Baru ditambahkan")
function getMainGridCards(container: HTMLElement) {
  return container.querySelectorAll(".ant-row .ant-col");
}

// Helper: urutan teks di grid utama
function getMainGridTextOrder(container: HTMLElement): string {
  return container.querySelector(".ant-row")?.textContent ?? "";
}

describe("MonitoringSPBPage — render & state", () => {
  beforeEach(() => {
    mockUseMonitoringSPB.mockReset();
  });

  it("menampilkan Spin saat loading", () => {
    mockUseMonitoringSPB.mockReturnValue({
      data: [],
      isLoading: true,
      refetch: vi.fn(),
    });

    const { container } = renderPage();

    // Spin antd punya class .ant-spin
    expect(container.querySelector(".ant-spin")).toBeInTheDocument();
    expect(screen.queryByText(/Dokumen Terdaftar/i)).not.toBeInTheDocument();
  });

  it("menampilkan header dengan jumlah dokumen terdaftar", () => {
    mockUseMonitoringSPB.mockReturnValue({
      data: sampleData,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText(/Monitoring SPB/i)).toBeInTheDocument();
    expect(screen.getByText(/4 Dokumen Terdaftar/i)).toBeInTheDocument();
  });

  it("menampilkan section 'Baru ditambahkan' maksimal 4 item", () => {
    mockUseMonitoringSPB.mockReturnValue({
      data: sampleData,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText("Baru ditambahkan")).toBeInTheDocument();

    // Section "Baru ditambahkan" menampilkan 4 item dari data
    // Format: "SPB: SPB-001" atau "PO: PO-XXX"
    expect(screen.getByText("SPB: SPB-001")).toBeInTheDocument();
    expect(screen.getByText("SPB: SPB-002")).toBeInTheDocument();
    expect(screen.getByText("SPB: SPB-003")).toBeInTheDocument();
    expect(screen.getByText("SPB: SPB-004")).toBeInTheDocument();
  });

  it("tidak menampilkan section 'Baru ditambahkan' lebih dari 4 item", () => {
    const manyData = [
      ...sampleData,
      {
        id: "SPB-005_NO_PO",
        spbNo: "SPB-005",
        poNo: null,
        date: "2024-01-05",
        status: "BELUM DATANG",
        itemsCount: 1,
        sortNumber: 10005.99,
      } as SPBDocumentGroup,
    ];

    mockUseMonitoringSPB.mockReturnValue({
      data: manyData,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    // "Baru ditambahkan" hanya 4 item pertama
    expect(screen.getByText("SPB: SPB-001")).toBeInTheDocument();
    expect(screen.getByText("SPB: SPB-004")).toBeInTheDocument();
    // SPB-005 hanya muncul di grid utama (exact match "SPB-005")
    expect(screen.queryByText("SPB: SPB-005")).not.toBeInTheDocument();
  });

  it("menampilkan semua card di grid untuk filter 'Semua'", () => {
    mockUseMonitoringSPB.mockReturnValue({
      data: sampleData,
      isLoading: false,
      refetch: vi.fn(),
    });

    const { container } = renderPage();
    expect(getMainGridCards(container)).toHaveLength(4);
  });

  it("menampilkan status Tag di setiap card", () => {
    mockUseMonitoringSPB.mockReturnValue({
      data: sampleData,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    // Status teks muncul (bisa >1 karena ada di card)
    expect(screen.getAllByText(/Status: BELUM DATANG/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Status: DATANG SESUAI/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Status: DATANG LEBIH/i).length).toBeGreaterThan(0);
  });

  it("menampilkan total barang per card", () => {
    mockUseMonitoringSPB.mockReturnValue({
      data: sampleData,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText(/Total: 2 Barang/i)).toBeInTheDocument();
    expect(screen.getByText(/Total: 3 Barang/i)).toBeInTheDocument();
  });
});

describe("MonitoringSPBPage — filter segmented", () => {
  beforeEach(() => {
    mockUseMonitoringSPB.mockReturnValue({
      data: sampleData,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it("default filter 'Semua' menampilkan 4 card", () => {
    const { container } = renderPage();
    expect(getMainGridCards(container)).toHaveLength(4);
  });

  it("filter 'Sudah di PO' hanya menampilkan item dengan poNo !== null", () => {
    const { container } = renderPage();

    fireEvent.click(screen.getByText("Sudah di PO"));

    // SPB-001 (PO-001), SPB-002 (PO-002), SPB-004 (PO-003) → 3 card
    expect(getMainGridCards(container)).toHaveLength(3);
  });

  it("filter 'Belum di PO' hanya menampilkan item dengan poNo === null", () => {
    const { container } = renderPage();

    fireEvent.click(screen.getByText("Belum di PO"));

    // SPB-003 (no_po null) → 1 card
    expect(getMainGridCards(container)).toHaveLength(1);
  });

  it("filter 'Datang' hanya menampilkan status DATANG SESUAI / DATANG LEBIH", () => {
    const { container } = renderPage();

    fireEvent.click(screen.getByText("Datang"));

    // SPB-002 (DATANG SESUAI), SPB-004 (DATANG LEBIH) → 2 card
    expect(getMainGridCards(container)).toHaveLength(2);
  });

  it("filter 'SPB Selesai' hanya menampilkan status DATANG SESUAI / DATANG LEBIH", () => {
    const { container } = renderPage();

    fireEvent.click(screen.getByText("SPB Selesai"));

    expect(getMainGridCards(container)).toHaveLength(2);
  });

  it("filter tanpa hasil menampilkan Empty state", () => {
    mockUseMonitoringSPB.mockReturnValue({
      data: [
        {
          id: "SPB-999_PO-999",
          spbNo: "SPB-999",
          poNo: "PO-999",
          date: "2024-01-01",
          status: "BELUM DATANG",
          itemsCount: 1,
          sortNumber: 999.99,
        },
      ],
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    fireEvent.click(screen.getByText("Datang"));

    expect(
      screen.getByText(/Tidak ada data SPB\/PO untuk kategori ini/i),
    ).toBeInTheDocument();
  });

  it("kembali ke 'Semua' menampilkan semua card lagi", () => {
    const { container } = renderPage();

    fireEvent.click(screen.getByText("Belum di PO"));
    expect(getMainGridCards(container)).toHaveLength(1);

    fireEvent.click(screen.getByText("Semua"));
    expect(getMainGridCards(container)).toHaveLength(4);
  });
});

describe("MonitoringSPBPage — sorting", () => {
  beforeEach(() => {
    mockUseMonitoringSPB.mockReturnValue({
      data: sampleData,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it("item selesai (DATANG) diletakkan di bawah item belum datang", () => {
    const { container } = renderPage();
    const text = getMainGridTextOrder(container);

    // Urutan yang diharapkan setelah sorting:
    // 1. SPB-001 (BELUM DATANG, sortNumber 1.01)
    // 2. SPB-003 (BELUM DATANG, sortNumber 10002.99)
    // 3. SPB-002 (DATANG, sortNumber 2.02) → done, lempar bawah
    // 4. SPB-004 (DATANG, sortNumber 4.03) → done, lempar bawah

    const posSPB001 = text.indexOf("SPB-001");
    const posSPB003 = text.indexOf("SPB-003");
    const posSPB002 = text.indexOf("SPB-002");
    const posSPB004 = text.indexOf("SPB-004");

    // Non-done harus di atas done
    expect(posSPB001).toBeLessThan(posSPB002);
    expect(posSPB001).toBeLessThan(posSPB004);
    expect(posSPB003).toBeLessThan(posSPB002);
    expect(posSPB003).toBeLessThan(posSPB004);

    // Di antara non-done, urut sortNumber
    expect(posSPB001).toBeLessThan(posSPB003);

    // Di antara done, urut sortNumber
    expect(posSPB002).toBeLessThan(posSPB004);
  });

  it("card tanpa PO (sortNumber besar) tetap di atas item done", () => {
    const { container } = renderPage();
    const text = getMainGridTextOrder(container);

    const posSPB003 = text.indexOf("SPB-003"); // no_po, BELUM DATANG
    const posSPB002 = text.indexOf("SPB-002"); // DATANG SESUAI

    expect(posSPB003).toBeLessThan(posSPB002);
  });
});

describe("MonitoringSPBPage — edge cases", () => {
  beforeEach(() => {
    mockUseMonitoringSPB.mockReset();
  });

  it("data kosong menampilkan Empty state dan 0 card", () => {
    mockUseMonitoringSPB.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    });

    const { container } = renderPage();

    expect(getMainGridCards(container)).toHaveLength(0);
    expect(
      screen.getByText(/Tidak ada data SPB\/PO untuk kategori ini/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/0 Dokumen Terdaftar/i)).toBeInTheDocument();
  });

  it("menampilkan format tanggal pada card 'Baru ditambahkan'", () => {
    mockUseMonitoringSPB.mockReturnValue({
      data: [sampleData[0]],
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    // formatDate("2024-01-01") → "01 Jan 2024" (locale id)
    expect(screen.getByText(/01 Jan 2024/i)).toBeInTheDocument();
  });
});