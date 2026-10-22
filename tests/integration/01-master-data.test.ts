import { describe, it, expect } from "vitest";
import { supabaseClient } from "../../src/shared/lib/supabaseClient";

describe.skip("Integration: Master Data (Tabel Barang)", () => {
  it("harus bisa mengambil data barang tanpa error", async () => {
    const { data, error } = await supabaseClient
      .from("barang")
      .select("*")
      .limit(5);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.length).toBeGreaterThan(0);

    if (data && data.length > 0) {
      expect(data[0]).toHaveProperty("kode");
      expect(data[0]).toHaveProperty("nama");
      expect(data[0]).toHaveProperty("stok");
    }
  });
});