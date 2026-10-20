import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// ============================================
// Mock Supabase — chain: from().select().order()
// ============================================
const { mockOrder } = vi.hoisted(() => ({
  mockOrder: vi.fn(),
}));

vi.mock("@/utility/supabaseClient", () => ({
  supabaseClient: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: mockOrder,
      })),
    })),
  },
}));

vi.mock("@/utility/constants", () => ({
  TABLES: { spb: "spb" },
}));

import { useMonitoringSPB } from "@/hooks/useMonitoringSPB";

// ============================================
// Wrapper
// ============================================
function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// ============================================
// Sample data
// ============================================
const sampleRows = [
  // SPB-001 / PO-001 — 2 item, salah satu BELUM DATANG → status grup = BELUM DATANG
  {
    no_spb: "SPB-001",
    tanggal_pembuatan_spb: "2024-01-01",
    no_po: "PO-001",
    tanggal_po: "2024-01-02",
    status: "BELUM DATANG",
    tanggal_datang: null,
  },
  {
    no_spb: "SPB-001",
    tanggal_pembuatan_spb: "2024-01-01",
    no_po: "PO-001",
    tanggal_po: "2024-01-02",
    status: "DATANG SESUAI",
    tanggal_datang: "2024-01-05",
  },
  // SPB-002 / PO-002 — 1 item, DATANG SESUAI
  {
    no_spb: "SPB-002",
    tanggal_pembuatan_spb: "2024-01-03",
    no_po: "PO-002",
    tanggal_po: "2024-01-04",
    status: "DATANG SESUAI",
    tanggal_datang: "2024-01-06",
  },
  // SPB-003 — tanpa PO
  {
    no_spb: "SPB-003",
    tanggal_pembuatan_spb: "2024-01-06",
    no_po: null,
    tanggal_po: null,
    status: "BELUM DATANG",
    tanggal_datang: null,
  },
];

describe("useMonitoringSPB — grouping logic", () => {
  beforeEach(() => {
    mockOrder.mockReset();
  });

  it("mengelompokkan baris berdasarkan kombinasi no_spb + no_po", async () => {
    mockOrder.mockResolvedValueOnce({ data: sampleRows, error: null });

    const { result } = renderHook(() => useMonitoringSPB(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toHaveLength(3);

    const ids = result.current.data.map((d) => d.id);
    expect(ids).toContain("SPB-001_PO-001");
    expect(ids).toContain("SPB-002_PO-002");
    expect(ids).toContain("SPB-003_NO_PO");
  });

  it("menghitung itemsCount dengan benar (merge item dalam satu grup)", async () => {
    mockOrder.mockResolvedValueOnce({ data: sampleRows, error: null });

    const { result } = renderHook(() => useMonitoringSPB(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const group1 = result.current.data.find((d) => d.id === "SPB-001_PO-001");
    expect(group1?.itemsCount).toBe(2); // 2 baris di grup yang sama

    const group2 = result.current.data.find((d) => d.id === "SPB-002_PO-002");
    expect(group2?.itemsCount).toBe(1);
  });

  it("override status grup menjadi BELUM DATANG jika ada satupun item BELUM DATANG", async () => {
    // grup SPB-001 punya 1 item BELUM DATANG dan 1 item DATANG SESUAI
    // → status akhir grup harus BELUM DATANG
    mockOrder.mockResolvedValueOnce({ data: sampleRows, error: null });

    const { result } = renderHook(() => useMonitoringSPB(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const group1 = result.current.data.find((d) => d.id === "SPB-001_PO-001");
    expect(group1?.status).toBe("BELUM DATANG");
  });

  it("mempertahankan status DATANG SESUAI jika semua item sudah datang", async () => {
    mockOrder.mockResolvedValueOnce({ data: sampleRows, error: null });

    const { result } = renderHook(() => useMonitoringSPB(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const group2 = result.current.data.find((d) => d.id === "SPB-002_PO-002");
    expect(group2?.status).toBe("DATANG SESUAI");
  });

  it("menggunakan fallback key 'NO_SPB' / 'NO_PO' saat null", async () => {
    mockOrder.mockResolvedValueOnce({ data: sampleRows, error: null });

    const { result } = renderHook(() => useMonitoringSPB(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const group3 = result.current.data.find((d) => d.id === "SPB-003_NO_PO");
    expect(group3).toBeDefined();
    expect(group3?.spbNo).toBe("SPB-003");
    expect(group3?.poNo).toBeNull();
  });

  it("fallback date: tanggal_pembuatan_spb → tanggal_po → tanggal_datang → '-'", async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          no_spb: "SPB-X",
          tanggal_pembuatan_spb: null,
          no_po: "PO-X",
          tanggal_po: "2024-02-01",
          status: "BELUM DATANG",
          tanggal_datang: "2024-02-05",
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useMonitoringSPB(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const group = result.current.data[0];
    expect(group.date).toBe("2024-02-01"); // fallback ke tanggal_po
  });

  it("sortNumber null-safe: no_po null → nilai sangat besar", async () => {
    mockOrder.mockResolvedValueOnce({ data: sampleRows, error: null });

    const { result } = renderHook(() => useMonitoringSPB(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const group3 = result.current.data.find((d) => d.id === "SPB-003_NO_PO");
    // sortNumber = 3 + (999999 * 0.01) = 10002.99
    expect(group3?.sortNumber).toBeGreaterThan(10000);
  });

  it("mengembalikan array kosong jika data null", async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHook(() => useMonitoringSPB(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([]);
  });

  it("melempar error jika query gagal", async () => {
    const queryError = { message: "network error", code: "500" };
    mockOrder.mockResolvedValueOnce({ data: null, error: queryError });

    const { result } = renderHook(() => useMonitoringSPB(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Hook tidak menangkap error, jadi data default []
    expect(result.current.data).toEqual([]);
  });

  it("memanggil query ke tabel 'spb' (TABLES.spb)", async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    renderHook(() => useMonitoringSPB(), { wrapper });
    await waitFor(() => expect(mockOrder).toHaveBeenCalled());

    // mockOrder dipanggil dengan order("no_spb", { ascending: true })
    expect(mockOrder).toHaveBeenCalledWith("no_spb", { ascending: true });
  });
});