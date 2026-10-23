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

  it("berhasil menampilkan SEMUA barang dalam SPB (termasuk yang punya PO)", async () => {
    // Menggunakan format relasi Supabase yang benar (po: { no_po: ... })
    mockData = [
      { id: 1, no_spb: "63#R1", po: null, nama_barang: "Barang A", qty_permintaan: 1, material_datang_qty: 0 },
      { id: 2, no_spb: "63#R1", po: { no_po: "PO-001", tanggal_po: "2026-01-01" }, nama_barang: "Barang B", qty_permintaan: 1, material_datang_qty: 0 },
    ];

    const { result } = renderHook(() => useMonitoringSPBDetail("63#R1", null), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Harus mengembalikan KEDUANYA (sesuai perilaku aplikasi asli)
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0].no_po).toBe("-");
    expect(result.current.items[1].no_po).toBe("PO-001");
  });

  it("menangani string kosong, '-', dan string 'null' dari DB sebagai tanpa PO", async () => {
    mockData = [
      { id: 1, no_spb: "63#R1", po: { no_po: "", tanggal_po: "2026-01-01" }, nama_barang: "Barang A", qty_permintaan: 1, material_datang_qty: 0 },
      { id: 2, no_spb: "63#R1", po: { no_po: "-", tanggal_po: "2026-01-01" }, nama_barang: "Barang B", qty_permintaan: 1, material_datang_qty: 0 },
      { id: 3, no_spb: "63#R1", po: { no_po: "null", tanggal_po: "2026-01-01" }, nama_barang: "Barang C", qty_permintaan: 1, material_datang_qty: 0 },
      { id: 4, no_spb: "63#R1", po: { no_po: "PO-123", tanggal_po: "2026-01-01" }, nama_barang: "Barang D", qty_permintaan: 1, material_datang_qty: 0 },
    ];

    const { result } = renderHook(() => useMonitoringSPBDetail("63#R1", null), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Harus mengembalikan keempatnya
    expect(result.current.items).toHaveLength(4);
  });
});