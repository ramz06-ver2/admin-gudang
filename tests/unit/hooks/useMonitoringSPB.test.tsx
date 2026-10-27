import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMonitoringSPB } from "@/features/spb/useMonitoringSPB";

let mockSpbData: any[] = [];
let mockPoData: any[] = [];
let mockSjData: any[] = [];

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

describe("useMonitoringSPB - Status Selesai & Sorting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpbData = [];
    mockPoData = [];
    mockSjData = [];
  });

  it("harus memberikan status 'Selesai' jika semua barang datang sesuai/lebih, dan menaruhnya paling bawah (setelah Datang)", async () => {
    mockSpbData = [
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
      {
        id: 5,
        no_spb: "30",
        qty_permintaan: 5,
        material_datang_qty: 0,
        material_datang_tgl: null,
        po: { no_po: "PO-30", tanggal_po: "2026-07-01" },
      },
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

    // 2. Cek Urutan (Sudah PO & Belum PO (bobot 1) -> Datang (2) -> Selesai (3))
    // Urutan di antara bobot 1 diurutkan berdasarkan No SPB terkecil (30 lalu 40)
    expect(data[0].spbNo).toBe("30");
    expect(data[1].spbNo).toBe("40");
    expect(data[2].spbNo).toBe("20");
    expect(data[3].spbNo).toBe("10");
  });
});
