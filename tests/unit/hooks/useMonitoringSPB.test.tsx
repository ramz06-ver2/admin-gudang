import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabaseClient } from "@/shared/lib/supabaseClient";
import { useMonitoringSPB } from "@/features/spb/useMonitoringSPB";

// Mock Supabase Client
vi.mock("@/shared/lib/supabaseClient", () => ({
  supabaseClient: {
    from: vi.fn(),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useMonitoringSPB - Pengujian Grouping SPB 37", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("harus menggabungkan semua no_po termasuk '10 REV' di dalam satu grup SPB 37", async () => {
    // 1. Simulasi data persis seperti gabungan table_spb & table_po
    const mockData = [
      // SPB 37 dengan PO 10 REV (ID 198 -> id_po 152)
      {
        id: 198,
        no_spb: "37",
        tgl_spb: "2026-09-21",
        material_datang_tgl: "2026-08-01",
        qty_permintaan: 1,
        material_datang_qty: 1,
        po: { no_po: "10 REV", tanggal_po: "2026-07-21" }
      },
      // SPB 37 dengan PO 59R1
      {
        id: 501,
        no_spb: "37",
        tgl_spb: "2026-09-21",
        material_datang_tgl: null,
        qty_permintaan: 1,
        material_datang_qty: 0,
        po: { no_po: "59R1", tanggal_po: "2026-10-07" }
      },
      // SPB 37 dengan PO 58
      {
        id: 502,
        no_spb: "37",
        tgl_spb: "2026-09-21",
        material_datang_tgl: null,
        qty_permintaan: 1,
        material_datang_qty: 0,
        po: { no_po: "58", tanggal_po: "2026-09-30" }
      }
    ];

    // Mock query chain: supabaseClient.from().select()
    const mockSelect = vi.fn().mockResolvedValue({ data: mockData, error: null });
    (supabaseClient.from as any).mockReturnValue({ select: mockSelect });

    // 2. Jalankan Hook
    const { result } = renderHook(() => useMonitoringSPB(), { wrapper });

    // 3. Tunggu sampai loading selesai
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // 4. Verifikasi
    expect(result.current.data).toHaveLength(1); // Harus jadi 1 Card
    const group = result.current.data[0];
    expect(group.spbNo).toBe("37");

    // Cek apakah "10 REV", "59R1", dan "58" ada di dalam teks poNo
    const poNumbers = group.poNo?.split(", ") || [];
    expect(poNumbers).toContain("10 REV");
    expect(poNumbers).toContain("59R1");
    expect(poNumbers).toContain("58");

    // Cek Status (karena ada 1 yang datang, status harus "Datang")
    expect(group.status).toBe("Datang");
  });

  it("harus menangani duplikat PO (seperti 59R1 muncul beberapa kali) tanpa duplikasi teks", async () => {
    const mockData = [
      { id: 1, no_spb: "37", po: { no_po: "59R1", tanggal_po: "2026-10-07" }, material_datang_tgl: null, material_datang_qty: 0, qty_permintaan: 1 },
      { id: 2, no_spb: "37", po: { no_po: "59R1", tanggal_po: "2026-10-07" }, material_datang_tgl: null, material_datang_qty: 0, qty_permintaan: 1 },
      { id: 3, no_spb: "37", po: { no_po: "10 REV", tanggal_po: "2026-07-21" }, material_datang_tgl: null, material_datang_qty: 0, qty_permintaan: 1 },
    ];

    const mockSelect = vi.fn().mockResolvedValue({ data: mockData, error: null });
    (supabaseClient.from as any).mockReturnValue({ select: mockSelect });

    const { result } = renderHook(() => useMonitoringSPB(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toHaveLength(1);
    const group = result.current.data[0];
    
    // Harus unik: "59R1, 10 REV" (bukan "59R1, 59R1, 10 REV")
    const poNumbers = group.poNo?.split(", ") || [];
    expect(poNumbers).toHaveLength(2);
    expect(poNumbers).toContain("59R1");
    expect(poNumbers).toContain("10 REV");
  });
});