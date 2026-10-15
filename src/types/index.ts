// ============================================
// Master entities
// ============================================

export interface Category {
  id: number;
  name: string;
  createdAt: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
}

export type StockStatus = "safe" | "low" | "out";

export interface Product {
  id: number;
  code: string;
  name: string;
  size: string | null;
  specification: string | null; // ← baru
  category: string; // ← baru: "Material" | "Alat Bantu"
  categoryId: number | null;
  categoryName?: string | null;
  unit: string;
  stock: number;
  minStock: number;
  costPrice: number;
  status?: StockStatus;
  createdAt: string;
}

// ============================================
// Transaksi
// ============================================

export interface StockEntry {
  id: number;
  entryNumber: string;
  productId: number;
  supplierId: number | null;
  quantity: number;
  unitPrice: number;
  total: number;
  date: string;
  note: string | null;
  createdAt: string;
  product?: Pick<Product, "id" | "code" | "name" | "unit">;
  supplier?: Pick<Supplier, "id" | "name">;
}

export interface StockExitItem {
  itemId: number;
  itemName: string;
  size: string | null; // ← baru
  unit: string;
  quantity: number;
}

export interface StockExit {
  id: number;
  nomorTransaksi: string; // ← baru
  timestamp: string;
  date: string;
  time: string;
  person: string; // dari nama_pekerja
  destination: string | null; // dari tujuan
  isBreakdown: boolean; // ← baru
  items: StockExitItem[];
}

// ============================================
// Wizard
// ============================================

export interface Team {
  id: string;
  name: string;
}

export interface Person {
  id: string;
  name: string;
  teamId: string;
}

export interface Workplace {
  id: string;
  name: string;
}

export type SetupStep = "workplace" | "person" | "done";

export interface EntryLine {
  itemId: number;
  itemName: string;
  unit: string;
  quantity: number;
}

// ============================================
// Dashboard
// ============================================

export interface DashboardStats {
  totalProducts: number;
  totalStock: number;
  todayInbound: number;
  todayOutbound: number;
}

export interface StockInChartItem {
  date: string;
  total: number;
}

// ============================================
// Form inputs
// ============================================

export interface CreateStockEntryInput {
  productId: number;
  supplierId: number | null;
  quantity: number;
  unitPrice: number;
  date: string;
  note?: string | null;
}
