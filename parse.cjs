const XLSX = require("xlsx");
const fs = require("fs");

// ============================================
// 1. Baca Excel
// ============================================
const wb = XLSX.readFile("Laporan barang material.xlsx");
const ws = wb.Sheets["Perbln September"];

const rows = XLSX.utils.sheet_to_json(ws, {
  header: 1,
  range: 5, // mulai dari row 6 (header di row 5)
  defval: "",
});

// ============================================
// 2. Parse + Merge item dengan prefix "-"
// ============================================
const products = [];
let parent = null;

for (const row of rows) {
  const no = row[0];
  const nama = String(row[1] || "").trim();
  const ukuran = String(row[2] || "").trim();
  const stock = parseInt(row[3]) || 0;
  const unit = String(row[4] || "pcs").trim();

  // Skip baris kosong / header
  if (!nama || nama === "NAMA BARANG" || !no) continue;

  // ==========================================
  // Sub-item: nama diawali "-" → gabung ke parent
  // ==========================================
  if (nama.startsWith("-") && parent) {
    const sub = nama.replace(/^-\s*/, "").trim();
    products.push({
      kode: `BRG-${String(products.length + 1).padStart(3, "0")}`,
      nama: `${parent.nama} - ${sub}`,
      ukuran: parent.ukuran || null,
      satuan: parent.satuan || "set",
      stok: 0,
    });
    continue;
  }

  // ==========================================
  // Item baru
  // ==========================================
  const item = {
    kode: `BRG-${String(products.length + 1).padStart(3, "0")}`,
    nama,
    ukuran: ukuran || null,
    satuan: unit || "pcs",
    stok: stock,
  };
  products.push(item);
  parent = item;
}

// ============================================
// 3. Report
// ============================================
console.log(`\n📊 Total produk: ${products.length}\n`);
console.log("📋 Sample 10 pertama:");
console.log("─".repeat(85));

products.slice(0, 10).forEach((p, i) => {
  console.log(
    `${String(i + 1).padStart(3)}. ${p.kode} | ${p.nama.padEnd(40)} | ${String(p.ukuran ?? "-").padEnd(15)} | ${p.satuan}`,
  );
});

// Cek item yang di-merge
const merged = products.filter((p) => p.nama.includes(" - "));
console.log(`\n🔗 Item di-merge dari "-": ${merged.length}`);
merged.forEach((p) =>
  console.log(`   • ${p.nama} (ukuran: ${p.ukuran ?? "-"})`),
);

// Cek duplikat kode
const codes = products.map((p) => p.kode);
const dupes = codes.filter((c, i) => codes.indexOf(c) !== i);
if (dupes.length > 0) {
  console.log(`\n⚠️  Duplikat kode: ${dupes.length}`);
} else {
  console.log(`\n✅ Tidak ada duplikat kode`);
}

// ============================================
// 4. Simpan ke JSON
// ============================================
fs.writeFileSync("products.json", JSON.stringify(products, null, 2));
console.log(`\n💾 Disimpan ke products.json (${products.length} produk)`);

// ============================================
// 5. Sample struktur akhir
// ============================================
console.log(`\n📄 Struktur item (contoh):`);
console.log(JSON.stringify(products[0], null, 2));
