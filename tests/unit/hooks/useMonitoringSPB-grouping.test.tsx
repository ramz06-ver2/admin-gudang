import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMonitoringSPB } from "@/features/spb/useMonitoringSPB";

let mockSpbData: any[] = [];
let mockPoData: any[] = [];

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabaseClient: {
    from: vi.fn((table) => ({
      select: vi.fn().mockResolvedValue({
        data: table === "spb" ? mockSpbData : mockPoData,
        error: null,
      }),
    })),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useMonitoringSPB - Grouping PO Tanpa SPB", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpbData = [];
    mockPoData = [];
  });

  it("harus menggabungkan 42 barang dengan No PO 34 menjadi 1 card", async () => {
    // Simulasi data PO 34 dengan 42 baris barang
    mockPoData = Array.from({ length: 42 }, (_, i) => ({
      id: 100 + i, // ID unik per baris
      no_po: "34", // No PO sama
      tanggal_po: "2026-08-21",
      id_spb: null, // Tidak terikat SPB
      material_datang_tgl: null,
      material_datang_qty: 0,
    }));

    const { result } = renderHook(() => useMonitoringSPB(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const data = result.current.data;

    // Harusnya cuma ada 1 card (bukan 42)
    expect(data).toHaveLength(1);

    const group = data[0];
    expect(group.poNo).toBe("34");
    expect(group.itemsCount).toBe(42); // Total barang harus 42
    expect(group.status).toBe("Sudah PO");
    expect(group.spbNo).toBeNull();
  });
});
