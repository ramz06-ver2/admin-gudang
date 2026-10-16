import { describe, it, expect } from "vitest";
import { supabaseClient } from "../../src/utility/supabaseClient";

describe("Integration: Relasi Tabel SPB dan PO", () => {
  it("tabel po harus memiliki 62 data sesuai sampel", async () => {
    const { count, error } = await supabaseClient
      .from("po")
      .select("*", { count: "exact", head: true });

    expect(error).toBeNull();
    expect(count).toBe(62);
  });

  it("tabel spb harus memiliki 70 data sesuai sampel", async () => {
    const { count, error } = await supabaseClient
      .from("spb")
      .select("*", { count: "exact", head: true });

    expect(error).toBeNull();
    expect(count).toBe(70);
  });

  it("harus bisa melakukan relasi (join) dari tabel spb ke tabel po menggunakan po_id", async () => {
    // Sintaks po(*) akan divalidasi oleh Supabase. Jika relasi Foreign Key benar, ini akan berhasil
    const { data, error } = await supabaseClient
      .from("spb")
      .select("no_spb, nama_barang, po(no_po, supplier)")
      .limit(10);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.length).toBeGreaterThan(0);

    // Memastikan ada item SPB yang berhasil membawa data PO di dalamnya
    const linkedData = data?.filter((item) => item.po !== null);
    expect(linkedData).toBeDefined();
    expect(linkedData?.length).toBeGreaterThan(0);
  });
});