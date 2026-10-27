import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMonitoringSPB } from "@/features/spb/useMonitoringSPB";

let mockSpbData: any[] = [];
let mockPoData: any[] = [];
let mockSjData: any[] = []; // ✅ Tambahkan mock untuk surat_jalan

vi.mock("@/shared/lib/supabaseClient", () => ({
  supabaseClient: {
    from: vi.fn((table) => {
      let data: any[] = [];
      if (table === "spb") data = mockSpbData;
      else if (table === "po") data = mockPoData;
      else if (table === "surat_jalan") data = mockSjData;

      return {
        select: vi.fn().mockResolvedValue({ data, error: null }),
      };
    }),
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
    mockSjData = [];
  });

  it("harus menggabungkan 42 barang dengan No PO 34 menjadi 1 card", async () => {
    mockPoData = Array.from({ length: 42 }, (_, i) => ({
      id: 100 + i,
      no_po: "34",
      tanggal_po: "2026-08-21",
      id_spb: null,
      material_datang_tgl: null,
      material_datang_qty: 0,
    }));

    const { result } = renderHook(() => useMonitoringSPB(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const data = result.current.data;
    expect(data).toHaveLength(1);

    const group = data[0];
    expect(group.poNo).toBe("34");
    expect(group.itemsCount).toBe(42);
    expect(group.status).toBe("Sudah PO");
    expect(group.spbNo).toBeNull();
  });
});
