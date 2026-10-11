import dayjs from "dayjs";
import type { StockEntry, StockInChartItem } from "../types";

// ============================================
// Transaksi barang masuk (untuk list/detail)
// ============================================
export const mockStockEntries: StockEntry[] = [
  {
    id: 1,
    entryNumber: "SE-20251011-001",
    productId: 1,
    supplierId: 1,
    quantity: 50,
    unitPrice: 65000,
    total: 3250000,
    date: dayjs().format("YYYY-MM-DD"),
    note: "Pembelian rutin",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    entryNumber: "SE-20251011-002",
    productId: 2,
    supplierId: 1,
    quantity: 100,
    unitPrice: 15000,
    total: 1500000,
    date: dayjs().format("YYYY-MM-DD"),
    note: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    entryNumber: "SE-20251010-001",
    productId: 3,
    supplierId: 2,
    quantity: 30,
    unitPrice: 45000,
    total: 1350000,
    date: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
    note: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 4,
    entryNumber: "SE-20251009-001",
    productId: 5,
    supplierId: 1,
    quantity: 25,
    unitPrice: 12000,
    total: 300000,
    date: dayjs().subtract(2, "day").format("YYYY-MM-DD"),
    note: "Restock mingguan",
    createdAt: new Date().toISOString(),
  },
];

// ============================================
// Data grafik 30 hari terakhir (deterministik, bukan random)
// ============================================
const generateChart = (): StockInChartItem[] => {
  const result: StockInChartItem[] = [];
  // Pola: naik turun natural, bukan random murni (biar test stabil)
  const pattern = [
    0, 0, 45, 80, 120, 60, 0, 30, 95, 140, 70, 0, 0, 55, 110, 85, 40, 0, 20,
    75, 130, 100, 50, 0, 15, 90, 160, 120, 65, 0,
  ];

  for (let i = 29; i >= 0; i--) {
    const date = dayjs().subtract(i, "day").format("YYYY-MM-DD");
    const idx = 29 - i;
    result.push({ date, total: pattern[idx] ?? 0 });
  }
  return result;
};

export const mockStockInChart: StockInChartItem[] = generateChart();

// ============================================
// Helper: total masuk hari ini (dipakai di mocks/dashboard.ts)
// ============================================
export const getMockTodayInbound = (): number => {
  const today = dayjs().format("YYYY-MM-DD");
  return mockStockEntries
    .filter((e) => e.date === today)
    .reduce((sum, e) => sum + e.quantity, 0);
};