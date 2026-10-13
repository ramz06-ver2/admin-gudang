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
const products = JSON.parse(fs.readFileSync("products.json", "utf8"));

async function main() {
  console.log(`📤 Insert ${products.length} produk ke Supabase...\n`);

  const BATCH = 100;
  let total = 0;
  let failed = 0;

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
}

main().catch(console.error);
