export interface Category { id: number; name: string; createdAt: string; }
export interface Supplier { id: number; name: string; contact: string | null; phone: string | null; address: string | null; createdAt: string; }
export type StockStatus = "safe" | "low" | "out";

export interface Product {
  id: number; code: string; name: string; size: string | null; specification: string | null;
  category: string; categoryId: number | null; categoryName?: string | null;
  unit: string; stock: number; minStock: number; costPrice: number; status?: StockStatus; createdAt: string;
}

export interface StockEntry {
  id: number; entryNumber: string; productId: number; supplierId: number | null; quantity: number;
  unitPrice: number; total: number; date: string; note: string | null; createdAt: string;
  product?: Pick<Product, "id" | "code" | "name" | "unit">; supplier?: Pick<Supplier, "id" | "name">;
}

export interface StockExitItem { itemId: number; itemName: string; size: string | null; unit: string; quantity: number; }
export interface StockExit {
  id: number; nomorTransaksi: string; timestamp: string; date: string; time: string;
  person: string; destination: string | null; isBreakdown: boolean; items: StockExitItem[];
}

export interface Person { id: string; name: string; teamId?: string; }
export interface Workplace { id: string; name: string; }
export type SetupStep = "workplace" | "person" | "done";

export interface EntryLine { itemId: number; itemName: string; size?: string | null; unit: string; maxStock?: number; quantity: number; }
export interface OutboundLine { itemId: number; itemName: string; size: string | null; unit: string; maxStock: number; quantity: number; }
export interface PendingLine { itemId: number; itemName: string; size: string | null; unit: string; quantity: number; }

export interface DashboardStats { totalProducts: number; totalStock: number; todayInbound: number; todayOutbound: number; }
export interface StockInChartItem { date: string; total: number; }

export interface SPBDocumentGroup {
  id: string; spbNo: string | null; poNo: string | null; date: string; status: string; itemsCount: number; sortNumber: number;
}
export interface SPBItemDetail {
  id: number; no_spb: string | null; no_po: string | null; nama_barang: string;
  jumlah_permintaan: number | null; satuan: string | null; status: string;
  tanggal_po: string | null; tanggal_datang: string | null; tanggal_pembuatan_spb?: string | null;
}