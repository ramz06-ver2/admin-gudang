import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Setup Mock untuk Supabase Client
let mockData: any[] = [];
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  then: vi.fn((resolve) => resolve({ data: mockData, error: null })),
};

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabaseClient: {
    from: vi.fn(() => mockQuery),
  },
}));

import { useMonitoringSPBDetail } from "@/features/spb/useMonitoringSPBDetail";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useMonitoringSPBDetail - Logika Filtering Kebal Peluru", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = [];
  });

  it("berhasil memfilter id_po bernilai NULL", async () => {
    mockData = [
      { id: 1, no_spb: "63#R1", id_po: null, nama_barang: "Barang A" },
      { id: 2, no_spb: "63#R1", id_po: "PO-001", nama_barang: "Barang B" },
    ];
    const { result } = renderHook(() => useMonitoringSPBDetail("63#R1", null), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].no_po).toBe("-"); // Ter-map menjadi "-"
  });

  it("menangani string kosong, '-', dan string 'null' dari DB sebagai tanpa PO", async () => {
    // Simulasi data jelek / kotor di Database
    mockData = [
      { id: 1, no_spb: "63#R1", id_po: "", nama_barang: "Barang A" },
      { id: 2, no_spb: "63#R1", id_po: "-", nama_barang: "Barang B" },
      { id: 3, no_spb: "63#R1", id_po: "null", nama_barang: "Barang C" },
      { id: 4, no_spb: "63#R1", id_po: "PO-123", nama_barang: "Barang D" },
    ];
    
    // User mengklik kartu tanpa PO
    const { result } = renderHook(() => useMonitoringSPBDetail("63#R1", null), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    // Harus bisa menangkap Barang A, B, dan C
    expect(result.current.items).toHaveLength(3);
  });
});