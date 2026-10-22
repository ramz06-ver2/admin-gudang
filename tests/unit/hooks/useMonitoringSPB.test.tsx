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

describe("useMonitoringSPBDetail - Logika Filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = [];
  });

  it("berhasil memfilter item dengan id_po bernilai NULL", async () => {
    // Simulasi DB mengembalikan 2 barang
    mockData = [
      { id: 1, no_spb: "63#R1", id_po: null, nama_barang: "Barang A" },
      { id: 2, no_spb: "63#R1", id_po: "PO-001", nama_barang: "Barang B" },
    ];

    const { result } = renderHook(() => useMonitoringSPBDetail("63#R1", null), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Seharusnya hanya mengembalikan Barang A karena poNo tidak dikirim (null)
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].nama_barang).toBe("Barang A");
    expect(result.current.items[0].no_po).toBe("-");
  });

  it("kebal bug: memfilter item dengan id_po string kosong ('') saat poNo tidak diberikan", async () => {
    // Simulasi bug di database: PO kosong tersimpan sebagai string "" 
    mockData = [
      { id: 1, no_spb: "63#R1", id_po: "", nama_barang: "Barang C" },
      { id: 2, no_spb: "63#R1", id_po: "PO-002", nama_barang: "Barang D" },
    ];

    const { result } = renderHook(() => useMonitoringSPBDetail("63#R1", null), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Seharusnya JS berhasil mendeteksi string kosong sebagai Barang Tanpa PO
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].nama_barang).toBe("Barang C");
    expect(result.current.items[0].no_po).toBe("-");
  });

  it("memfilter item sesuai dengan poNo jika diberikan dengan akurat", async () => {
    mockData = [
      { id: 1, no_spb: "63#R1", id_po: "PO-001", nama_barang: "Barang A" },
      { id: 2, no_spb: "63#R1", id_po: "PO-002", nama_barang: "Barang B" },
    ];

    const { result } = renderHook(() => useMonitoringSPBDetail("63#R1", "PO-002"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Seharusnya hanya mengembalikan Barang B
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].no_po).toBe("PO-002"); // field id_po harus ter-mapping jadi no_po
  });
});