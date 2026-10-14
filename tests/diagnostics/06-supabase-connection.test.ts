import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

describe("FOCUS: Supabase Connection", () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_KEY;
  const supabase = createClient(url, key);

  it("Client berhasil dibuat", () => {
    expect(supabase).toBeDefined();
    expect(supabase.from).toBeDefined();
  });

  it("Bisa ping ke Supabase (health check)", async () => {
    const response = await fetch(`${url}/rest/v1/barang?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    expect(response.ok).toBe(true);
  }, 15_000);

  it("Tabel 'barang' bisa dibaca", async () => {
    const { data, error } = await supabase.from("barang").select("*").limit(3);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  }, 15_000);

  it("Data barang tidak kosong (≥ 1 baris)", async () => {
    const { count, error } = await supabase
      .from("barang")
      .select("*", { count: "exact", head: true });

    expect(error).toBeNull();
    expect(count).toBeGreaterThan(0);
    console.log(`📊 Total barang di Supabase: ${count}`);
  }, 15_000);

  it("Struktur kolom sesuai (kode, nama, ukuran, satuan, stok)", async () => {
    const { data, error } = await supabase.from("barang").select("*").limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.length).toBeGreaterThan(0);

    const row = data![0];
    expect(row).toHaveProperty("id");
    expect(row).toHaveProperty("kode");
    expect(row).toHaveProperty("nama");
    expect(row).toHaveProperty("ukuran");
    expect(row).toHaveProperty("satuan");
    expect(row).toHaveProperty("stok");
  }, 15_000);
});
