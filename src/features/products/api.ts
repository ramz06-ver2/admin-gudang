import { supabaseClient } from "../../shared/lib/supabaseClient";
import { TABLES } from "../../shared/lib/constants";
import { mapProduct } from "../../shared/lib/mappers";
import type { Product } from "../../shared/types";

export interface BarangInput {
  kode?: string;
  nama: string;
  ukuran?: string | null;
  spesifikasi?: string | null;
  kategori?: string;
  satuan?: string;
  stok?: number;
}

export const createBarang = async (input: BarangInput): Promise<Product> => {
  const rowPayload = {
    kode:
      input.kode?.trim() ||
      `BRG-${String(Math.floor(100 + Math.random() * 900))}`,
    nama: input.nama.trim(),
    ukuran: input.ukuran?.trim() || null,
    spesifikasi: input.spesifikasi?.trim() || null,
    kategori: input.kategori || "Material",
    satuan: input.satuan?.trim() || "pcs",
    stok: Number(input.stok ?? 0),
  };

  const { data, error } = await supabaseClient
    .from(TABLES.products)
    .insert([rowPayload])
    .select()
    .single();

  if (error) throw error;

  return mapProduct(
    data ?? {
      id: Date.now(),
      ...rowPayload,
      created_at: new Date().toISOString(),
    },
  );
};

export const updateBarang = async (
  id: number,
  input: Partial<BarangInput>,
): Promise<Product> => {
  const patch: Record<string, unknown> = {};
  if (input.kode !== undefined) patch.kode = input.kode.trim();
  if (input.nama !== undefined) patch.nama = input.nama.trim();
  if (input.ukuran !== undefined) patch.ukuran = input.ukuran?.trim() || null;
  if (input.spesifikasi !== undefined)
    patch.spesifikasi = input.spesifikasi?.trim() || null;
  if (input.kategori !== undefined) patch.kategori = input.kategori;
  if (input.satuan !== undefined) patch.satuan = input.satuan.trim();
  if (input.stok !== undefined) patch.stok = Number(input.stok);

  const { data, error } = await supabaseClient
    .from(TABLES.products)
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return mapProduct(
    data ?? {
      id,
      kode: String(patch.kode ?? `BRG-${id}`),
      nama: String(patch.nama ?? ""),
      ukuran: (patch.ukuran as string | null) ?? null,
      spesifikasi: (patch.spesifikasi as string | null) ?? null,
      kategori: String(patch.kategori ?? "Material"),
      satuan: String(patch.satuan ?? "pcs"),
      stok: Number(patch.stok ?? 0),
      created_at: new Date().toISOString(),
    },
  );
};

export const deleteBarang = async (id: number): Promise<void> => {
  const { error } = await supabaseClient
    .from(TABLES.products)
    .delete()
    .eq("id", id);

  if (error) throw error;
};
