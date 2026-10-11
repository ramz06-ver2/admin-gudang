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
// Transactions
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

export interface StockExit {
  id: number;
  exitNumber: string;
  productId: number;
  quantity: number;
  destination: string | null;
  date: string;
  note: string | null;
  createdAt: string;
}

// ============================================
// Dashboard / Reports
// ============================================

export interface DashboardStats {
  totalProducts: number;
  totalStock: number;
  todayInbound: number;
  lowStockCount: number;
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

export interface CreateStockExitInput {
  productId: number;
  quantity: number;
  destination?: string | null;
  date: string;
  note?: string | null;
}