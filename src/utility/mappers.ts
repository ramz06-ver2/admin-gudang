import type { Product } from "../types";

export const mapProduct = (row: Record<string, unknown>): Product => ({
  id: row.id as number,
  code: row.kode as string,
  name: row.nama as string,
  size: (row.ukuran as string) ?? null,
  unit: (row.satuan as string) ?? "pcs",
  stock: (row.stok as number) ?? 0,
  categoryId: null,
  categoryName: null,
  minStock: 0,
  costPrice: 0,
  createdAt: (row.created_at as string) ?? new Date().toISOString(),
});
