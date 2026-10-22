import type { Product, StockExit } from "../types";

interface DBProductRow {
  id: number; kode: string; nama: string; ukuran: string | null; spesifikasi: string | null;
  kategori: string; satuan: string; stok: number; created_at: string;
}

export const mapProduct = (row: any): Product => {
  const r = row as DBProductRow;
  return {
    id: r.id, code: r.kode, name: r.nama, size: r.ukuran ?? null, specification: r.spesifikasi ?? null,
    category: r.kategori ?? "Material", categoryId: null, categoryName: null,
    unit: r.satuan ?? "pcs", stock: r.stok ?? 0, minStock: 0, costPrice: 0,
    status: undefined, createdAt: r.created_at ?? new Date().toISOString(),
  };
};

interface StockExitRow {
  id: number; nomor_transaksi: string | null; barang_id: number; nama_pekerja: string | null;
  nama_barang: string; ukuran_barang: string | null; satuan_barang: string | null;
  jumlah_barang_keluar: number; tujuan: string | null; is_breakdown: boolean | null; created_at: string;
}

export const mapStockExits = (rows: any[]): StockExit[] => {
  const typedRows = rows as StockExitRow[];
  const grouped = new Map<string, StockExit>();

  for (const row of typedRows) {
    const key = row.nomor_transaksi ?? `temp-${row.id}`;
    if (!grouped.has(key)) {
      const created = new Date(row.created_at);
      grouped.set(key, {
        id: row.id, nomorTransaksi: key, timestamp: row.created_at, date: created.toISOString().split("T")[0],
        time: created.toISOString().slice(11, 16), person: row.nama_pekerja ?? "-",
        destination: row.tujuan, isBreakdown: row.is_breakdown ?? true, items: [],
      });
    }
    grouped.get(key)!.items.push({
      itemId: row.barang_id, itemName: row.nama_barang, size: row.ukuran_barang,
      unit: row.satuan_barang ?? "pcs", quantity: row.jumlah_barang_keluar,
    });
  }
  return Array.from(grouped.values());
};