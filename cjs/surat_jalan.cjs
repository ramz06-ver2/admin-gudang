const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

// Membaca file environment (.env.local atau .env) dari root folder
const envPathLocal = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envPathLocal)) {
  dotenv.config({ path: envPathLocal });
} else {
  dotenv.config({ path: envPath });
}

// Mengambil URL
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

// LOGIKA PRIORITAS: Wajib mencari SERVICE_KEY terlebih dahulu untuk menembus RLS
const SUPABASE_KEY = 
  process.env.SUPABASE_SERVICE_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_KEY || 
  process.env.SUPABASE_ANON_KEY;

const TABLE_NAME = "barang_masuk";
const OUTPUT_FILE = path.join(__dirname, "barang_masuk.json"); 
const PAGE_SIZE = 1000;

async function main() {
  console.log("Mengecek Kredensial Supabase...");
  
  // Deteksi kunci mana yang sedang digunakan
  const isServiceKey = (SUPABASE_KEY === process.env.SUPABASE_SERVICE_KEY) || (SUPABASE_KEY === process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  console.log(`- Status URL : Terdeteksi`);
  console.log(`- Status KEY : ${isServiceKey ? "SERVICE ROLE KEY (Bypass RLS Aktif ✅)" : "ANON KEY (Mungkin terhalang RLS ⚠️)"}`);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "[FATAL ERROR] Kredensial tidak ditemukan! Pastikan di dalam file .env atau .env.local ada URL dan KEY Supabase Anda."
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const allData = [];

  console.log(`\nMengambil data dari tabel "${TABLE_NAME}"...`);

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Gagal mengambil data: ${error.message}`);
    }

    allData.push(...data);
    console.log(`Data terkumpul: ${allData.length}`);

    // Jika data yang didapat lebih sedikit dari limit (PAGE_SIZE), berarti ini halaman terakhir
    if (data.length < PAGE_SIZE) {
      break;
    }
  }

  // Menyimpan file
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(allData, null, 2),
    "utf8"
  );

  console.log("\n--- EXPORT SELESAI ---");
  console.log(`Total data ditarik: ${allData.length} baris`);
  console.log(`File JSON tersimpan di: ${OUTPUT_FILE}`);
  
  if (allData.length === 0) {
      console.log("\n[INFO] Tabel berhasil diakses, tapi memang belum ada data (kosong) di Supabase.");
  }
}

main().catch((error) => {
  console.error("\n[SYSTEM ERROR] Export gagal:", error.message);
  process.exitCode = 1;
});