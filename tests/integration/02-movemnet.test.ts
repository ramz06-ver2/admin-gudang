import { describe, it, expect } from "vitest";
import { supabaseClient } from "../../src/utility/supabaseClient";

describe("Integration: Transaksi Barang Masuk & Keluar", () => {
  it("harus bisa mengakses tabel barang_masuk", async () => {
    const { data, error } = await supabaseClient
      .from("barang_masuk")
      .select("*")
      .limit(5);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it("harus bisa mengakses tabel barang_keluar", async () => {
    const { data, error } = await supabaseClient
      .from("barang_keluar")
      .select("*")
      .limit(5);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});