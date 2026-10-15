const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
require("dotenv").config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ SUPABASE_URL atau SUPABASE_KEY belum diisi di .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// 1. Baca products.json
// ============================================
if (!fs.existsSync("products.json")) {
  console.error("❌ File products.json tidak ditemukan");
  console.error("   Jalankan dulu: node convert.cjs");
  process.exit(1);
}

const rawProducts = JSON.parse(fs.readFileSync("products.json", "utf8"));

// Mapping JSON → schema baru
const products = rawProducts.map((p) => ({
  kode: p.kode,
  nama: p.nama,
  ukuran: p.ukuran ?? null,
  spesifikasi: null, // ← kosong dulu, diisi manual nanti
  satuan: p.satuan ?? "pcs",
  stok: p.stok ?? 0,
  kategori: p.kategori ?? "Material",
}));

console.log(`📦 Total produk: ${products.length}`);
console.log(
  `   ├─ Material   : ${products.filter((p) => p.kategori === "Material").length}`,
);
console.log(
  `   └─ Alat Bantu : ${products.filter((p) => p.kategori === "Alat Bantu").length}\n`,
);

// ============================================
// 2. Insert batch
// ============================================
async function main() {
  const BATCH = 100;
  let total = 0;
  let failed = 0;

  console.log("📤 Insert ke Supabase...\n");

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);

    const { error } = await supabase.from("barang").insert(batch);

    if (error) {
      console.error(`❌ Batch ${Math.floor(i / BATCH) + 1}: ${error.message}`);
      failed += batch.length;
      continue;
    }

    total += batch.length;
    console.log(`✅ ${total}/${products.length}`);
  }

  console.log(`\n🎉 Selesai!`);
  console.log(`   Berhasil: ${total}`);
  console.log(`   Gagal:    ${failed}`);

  // Verifikasi
  const { count } = await supabase
    .from("barang")
    .select("*", { count: "exact", head: true });

  console.log(`\n📊 Total di database: ${count} baris`);
}

main().catch(console.error);
