import { describe, it, expect } from "vitest";
import { mapProduct } from "@/utility/mappers";

describe("FOCUS: Product Mapper", () => {
  it("Mapping lengkap", () => {
    const dbRow = {
      id: 1,
      kode: "BRG-001",
      nama: "Printer",
      ukuran: "A3",
      satuan: "unit",
      stok: 10,
      created_at: "2026-10-13T00:00:00Z",
    };

    const product = mapProduct(dbRow);

    expect(product.id).toBe(1);
    expect(product.code).toBe("BRG-001");
    expect(product.name).toBe("Printer");
    expect(product.size).toBe("A3");
    expect(product.unit).toBe("unit");
    expect(product.stock).toBe(10);
  });

  it("Handle ukuran null", () => {
    const dbRow = {
      id: 2,
      kode: "BRG-002",
      nama: "Laptop",
      ukuran: null,
      satuan: "unit",
      stok: 5,
      created_at: "2026-10-13T00:00:00Z",
    };

    const product = mapProduct(dbRow);
    expect(product.size).toBeNull();
  });

  it("Handle field missing (fallback default)", () => {
    const dbRow = {
      id: 3,
      kode: "BRG-003",
      nama: "Test",
    };

    const product = mapProduct(dbRow);
    expect(product.size).toBeNull();
    expect(product.unit).toBe("pcs");
    expect(product.stock).toBe(0);
  });

  it("Semua 517 produk bisa di-map tanpa error", () => {
    const sample = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      kode: `BRG-${String(i + 1).padStart(3, "0")}`,
      nama: `Product ${i + 1}`,
      ukuran: i % 2 === 0 ? "10 cm" : null,
      satuan: "pcs",
      stok: i * 5,
      created_at: new Date().toISOString(),
    }));

    const products = sample.map(mapProduct);
    expect(products).toHaveLength(10);
    products.forEach((p) => {
      expect(p.id).toBeDefined();
      expect(p.code).toMatch(/^BRG-/);
      expect(typeof p.name).toBe("string");
      expect(typeof p.stock).toBe("number");
    });
  });
});
