import type { Product, StockExit, StockExitItem } from "../types";

// ============================================
// Product — DB row → Product
// ============================================
export const mapProduct = (row: Record<string, unknown>): Product => ({
  id: row.id as number,
  code: row.kode as string,
  name: row.nama as string,
  size: (row.ukuran as string) ?? null,
  specification: (row.spesifikasi as string) ?? null,
  category: (row.kategori as string) ?? "Material",
  categoryId: null,
  categoryName: null,
  unit: (row.satuan as string) ?? "pcs",
  stock: (row.stok as number) ?? 0,
  minStock: 0,
  costPrice: 0,
  status: undefined,
  createdAt: (row.created_at as string) ?? new Date().toISOString(),
});

// ============================================
// Stock Exit — group by nomor_transaksi
// ============================================
interface StockExitRow {
  id: number;
  nomor_transaksi: string | null;
  barang_id: number;
  nama_pekerja: string | null;
  nama_barang: string;
  ukuran_barang: string | null;
  satuan_barang: string | null;
  jumlah_barang_keluar: number;
  tujuan: string | null;
  is_breakdown: boolean | null;
  created_at: string;
}

export const mapStockExits = (rows: StockExitRow[]): StockExit[] => {
  const grouped = new Map<string, StockExit>();

  for (const row of rows) {
    const key = row.nomor_transaksi ?? `temp-${row.id}`;

    if (!grouped.has(key)) {
      const created = new Date(row.created_at);
      grouped.set(key, {
        id: row.id,
        nomorTransaksi: key,
        timestamp: row.created_at,
        date: created.toISOString().split("T")[0],
        time: created.toISOString().slice(11, 16),
        person: row.nama_pekerja ?? "-",
        destination: row.tujuan,
        isBreakdown: row.is_breakdown ?? true,
        items: [],
      });
    }

    const item: StockExitItem = {
      itemId: row.barang_id,
      itemName: row.nama_barang,
      size: row.ukuran_barang,
      unit: row.satuan_barang ?? "pcs",
      quantity: row.jumlah_barang_keluar,
    };

    grouped.get(key)!.items.push(item);
  }

  return Array.from(grouped.values());
};
