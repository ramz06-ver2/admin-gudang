import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp, ConfigProvider } from "antd";
import type { ReactNode } from "react";

vi.mock("@/features/spb/useMonitoringSPB", () => ({
  useMonitoringSPB: vi.fn(),
  updateDocumentTitle: vi.fn().mockResolvedValue(undefined),
}));

import { useMonitoringSPB } from "@/features/spb/useMonitoringSPB";
import MonitoringSPBPage from "@/features/spb/pages/MonitoringSPBPage";
import { STORAGE_KEY } from "@/app/providers/authProvider";

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

const data = [
  {
    id: "SPB_1",
    spbNo: "SPB-01",
    spbTitle: "Proyek A",
    poNo: "PO-01",
    poTitle: "Besi",
    spbSourceFile: "https://drive.google.com/file/d/spb1/view",
    poSourceFile: "https://drive.google.com/file/d/po1/view",
    date: "2026-10-20",
    itemsCount: 2,
    sortNumber: 1,
    status: "Sudah PO",
    itemNames: ["Besi"],
  },
  {
    id: "SPB_2",
    spbNo: "SPB-02",
    spbTitle: "Proyek B",
    poNo: null,
    poTitle: null,
    spbSourceFile: "javascript:alert(1)",
    date: "2026-10-21",
    itemsCount: 1,
    sortNumber: 2,
    status: "Belum PO",
    itemNames: ["Pasir"],
  },
];

describe("MonitoringSPBPage - akses publik vs login", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(useMonitoringSPB).mockReturnValue({
      data: data as any,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("ikon file SPB & PO tampil untuk user belum login dan membuka tab baru dengan aman", () => {
    render(<MonitoringSPBPage />, { wrapper: Wrapper });

    const spbLink = screen.getByTestId("source-file-spb-SPB-01");
    expect(spbLink).toHaveAttribute("href", "https://drive.google.com/file/d/spb1/view");
    expect(spbLink).toHaveAttribute("target", "_blank");
    expect(spbLink.getAttribute("rel")).toContain("noopener");
    expect(spbLink.getAttribute("rel")).toContain("noreferrer");

    expect(screen.getByTestId("source-file-po-PO-01")).toHaveAttribute(
      "href",
      "https://drive.google.com/file/d/po1/view",
    );
  });

  it("tidak merender link jika source_file tidak aman (javascript:)", () => {
    render(<MonitoringSPBPage />, { wrapper: Wrapper });
    expect(screen.queryByTestId("source-file-spb-SPB-02")).not.toBeInTheDocument();
  });

  it("filter 'Belum Diproses' tidak tersedia untuk user belum login", () => {
    render(<MonitoringSPBPage />, { wrapper: Wrapper });
    expect(screen.queryByText("Belum Diproses")).not.toBeInTheDocument();
    expect(screen.getByText("Belum di PO")).toBeInTheDocument();
  });

  it("filter 'Belum Diproses' tersedia untuk user yang login", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: "1", email: "a@a.com", name: "A", role: "admin" }),
    );
    render(<MonitoringSPBPage />, { wrapper: Wrapper });
    expect(screen.getByText("Belum Diproses")).toBeInTheDocument();
  });

  it("filter tersimpan 'Belum Diproses' diabaikan saat belum login", () => {
    localStorage.setItem("spb_filter", "Belum Diproses");
    render(<MonitoringSPBPage />, { wrapper: Wrapper });
    // Kembali ke 'Semua' -> kedua card tetap tampil
    expect(screen.getByText("SPB-01")).toBeInTheDocument();
    expect(screen.getByText("SPB-02")).toBeInTheDocument();
  });
});

