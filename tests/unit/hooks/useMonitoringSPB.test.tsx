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

describe("useMonitoringSPB - Status Selesai & Sorting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpbData = [];
    mockPoData = [];
  });

  it("harus memberikan status 'Selesai' jika semua barang datang sesuai/lebih, dan menaruhnya paling bawah (setelah Datang)", async () => {
    mockSpbData = [
      // SPB 10: Selesai
      {
        id: 1,
        no_spb: "10",
        qty_permintaan: 5,
        material_datang_qty: 5,
        material_datang_tgl: "2026-08-01",
        po: { no_po: "PO-10", tanggal_po: "2026-07-01" },
      },
      {
        id: 2,
        no_spb: "10",
        qty_permintaan: 10,
        material_datang_qty: 12,
        material_datang_tgl: "2026-08-01",
        po: { no_po: "PO-10", tanggal_po: "2026-07-01" },
      },

      // SPB 20: Datang
      {
        id: 3,
        no_spb: "20",
        qty_permintaan: 5,
        material_datang_qty: 0,
        material_datang_tgl: null,
        po: { no_po: "PO-20", tanggal_po: "2026-07-01" },
      },
      {
        id: 4,
        no_spb: "20",
        qty_permintaan: 10,
        material_datang_qty: 10,
        material_datang_tgl: "2026-08-01",
        po: { no_po: "PO-20", tanggal_po: "2026-07-01" },
      },

      // SPB 30: Sudah PO
      {
        id: 5,
        no_spb: "30",
        qty_permintaan: 5,
        material_datang_qty: 0,
        material_datang_tgl: null,
        po: { no_po: "PO-30", tanggal_po: "2026-07-01" },
      },

      // SPB 40: Belum PO
      {
        id: 6,
        no_spb: "40",
        qty_permintaan: 5,
        material_datang_qty: 0,
        material_datang_tgl: null,
        po: null,
      },
    ];

    const { result } = renderHook(() => useMonitoringSPB(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const data = result.current.data;

    // 1. Cek Status
    expect(data.find((d) => d.spbNo === "10")?.status).toBe("Selesai");
    expect(data.find((d) => d.spbNo === "20")?.status).toBe("Datang");
    expect(data.find((d) => d.spbNo === "30")?.status).toBe("Sudah PO");
    expect(data.find((d) => d.spbNo === "40")?.status).toBe("Belum PO");

    // 2. Cek Urutan (Sudah PO -> Datang -> Selesai -> Belum PO)
    expect(data[0].spbNo).toBe("30"); // Sudah PO
    expect(data[1].spbNo).toBe("20"); // Datang
    expect(data[2].spbNo).toBe("10"); // Selesai
    expect(data[3].spbNo).toBe("40"); // Belum PO
  });
});
