const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "❌ Error: Kredensial tidak ditemukan di .env (VITE_SUPABASE_URL atau VITE_SUPABASE_KEY)",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Daftar tabel yang ingin di-export
const tablesToExport = ["spb", "po", "surat_jalan", "daftar_monitoring"];

async function exportSemuaData() {
  console.log("🚀 Memulai proses ekspor data besar-besaran...");

  for (const tableName of tablesToExport) {
    // Menyiapkan path file agar pasti tersimpan di sebelah script ini
    const filePath = path.join(__dirname, `table_${tableName}.json`);

    try {
      console.log(`\n📥 Mengambil data dari tabel '${tableName}'...`);
      const { data, error } = await supabase.from(tableName).select("*");

      if (error) throw error;

      // Menyimpan ke file JSON
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
      console.log(
        `✅ Sukses! ${data.length} baris disimpan ke table_${tableName}.json`,
      );
    } catch (error) {
      console.error(
        `❌ Gagal mengekspor tabel '${tableName}':`,
        error.message || error,
      );
    }
  }

  console.log("\n🎉 Semua proses ekspor selesai!");
}

exportSemuaData();
