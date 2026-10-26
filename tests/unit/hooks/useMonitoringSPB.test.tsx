import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabaseClient } from "@/shared/lib/supabaseClient";
import { useMonitoringSPB } from "@/features/spb/useMonitoringSPB";

// ✅ FIX MOCK: Pisahkan data mock untuk tabel 'spb' dan 'po'
let mockSpbData: any[] = [];
let mockPoData: any[] = [];

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabaseClient: {
    from: vi.fn((table) => {
      if (table === "spb") {
        return {
          select: vi.fn().mockResolvedValue({ data: mockSpbData, error: null })
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: mockPoData, error: null })
      };
    }),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useMonitoringSPB - Pengujian Grouping SPB 37", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpbData = [];
    mockPoData = [];
  });

  it("harus menggabungkan semua no_po termasuk '10 REV' di dalam satu grup SPB 37", async () => {
    // Data SPB (Hanya mengembalikan barang yang punya relasi join PO)
    mockSpbData = [
      {
        id: 198, no_spb: "37", tgl_spb: "2026-09-21",
        material_datang_tgl: "2026-08-01", material_datang_qty: 1, qty_permintaan: 1,
        po: { no_po: "10 REV", tanggal_po: "2026-07-21" } // Join PO
      },
      {
        id: 501, no_spb: "37", tgl_spb: "2026-09-21",
        material_datang_tgl: null, material_datang_qty: 0, qty_permintaan: 1,
        po: null
      }
    ];

    // Data PO (Kosongkan jika tidak ada PO tanpa SPB)
    mockPoData = [];

    const { result } = renderHook(() => useMonitoringSPB(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toHaveLength(1); 
    const group = result.current.data[0];
    expect(group.spbNo).toBe("37");
    
    // Pastikan "10 REV" masuk
    expect(group.poNo).toContain("10 REV");
    expect(group.status).toBe("Datang");
  });

  it("harus menangani duplikat PO tanpa duplikasi teks", async () => {
    mockSpbData = [
      { id: 1, no_spb: "37", po: { no_po: "59R1", tanggal_po: "2026-10-07" }, material_datang_tgl: null },
      { id: 2, no_spb: "37", po: { no_po: "59R1", tanggal_po: "2026-10-07" }, material_datang_tgl: null },
      { id: 3, no_spb: "37", po: { no_po: "10 REV", tanggal_po: "2026-07-21" }, material_datang_tgl: null },
    ];
    mockPoData = [];

    const { result } = renderHook(() => useMonitoringSPB(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const group = result.current.data[0];
    const poNumbers = group.poNo?.split(", ") || [];
    
    expect(poNumbers).toHaveLength(2);
    expect(poNumbers).toContain("59R1");
    expect(poNumbers).toContain("10 REV");
  });
});