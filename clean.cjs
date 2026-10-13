const fs = require("fs");

// Baca
const products = JSON.parse(fs.readFileSync("products.json", "utf8"));

// Buang field
const cleaned = products.map((p) => {
  const { stok_minimum, harga_beli, ...rest } = p;
  return rest;
});

// Tulis ulang
fs.writeFileSync("products.json", JSON.stringify(cleaned, null, 2));

console.log(`✅ Berhasil bersihkan ${cleaned.length} produk`);
console.log("Sample:");
console.log(JSON.stringify(cleaned[0], null, 2));
