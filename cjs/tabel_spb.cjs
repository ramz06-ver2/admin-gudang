const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

require("dotenv").config({
  path: path.join(__dirname, "../.env.local"),
});

// ================================
// KONFIGURASI
// ================================
const OUTPUT_FILE = path.join(__dirname, "tabel_spb.json");
const TABLE_NAME = "spb";
const PAGE_SIZE = 1000;

// ================================
// EXPORT DATA SPB
// ================================
async function exportSPB() {
  try {
    // Ambil konfigurasi Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_KEY;

    // Validasi konfigurasi
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "VITE_SUPABASE_URL atau VITE_SUPABASE_KEY tidak ditemukan di .env.local"
      );
    }

    console.log("Konfigurasi Supabase ditemukan.");
    console.log("URL Supabase:", supabaseUrl);
    console.log(`Mengambil seluruh data dari tabel ${TABLE_NAME}...`);

    // Membuat client Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    const allData = [];
    let offset = 0;

    // Mengambil data secara bertahap
    while (true) {
      console.log(
        `Mengambil data dari baris ${offset + 1} sampai ${offset + PAGE_SIZE}...`
      );

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        throw new Error(
          `Gagal mengambil data dari tabel ${TABLE_NAME}: ${error.message}`
        );
      }

      if (!data || data.length === 0) {
        break;
      }

      allData.push(...data);

      console.log(`Data pada halaman ini: ${data.length}`);
      console.log(`Total data terkumpul: ${allData.length}`);

      // Jika jumlah data kurang dari batas halaman,
      // berarti data sudah selesai diambil.
      if (data.length < PAGE_SIZE) {
        break;
      }

      offset += PAGE_SIZE;
    }

    // Simpan seluruh data menjadi JSON
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(allData, null, 2),
      "utf8"
    );

    console.log("\n====================================");
    console.log("EXPORT SPB BERHASIL");
    console.log("====================================");
    console.log(`Nama tabel : ${TABLE_NAME}`);
    console.log(`Total data : ${allData.length}`);
    console.log(`ID pertama : ${allData.length ? allData[0].id : "Tidak ada data"}`);
    console.log(`ID terakhir: ${allData.length ? allData[allData.length - 1].id : "Tidak ada data"}`);
    console.log(`File hasil : ${OUTPUT_FILE}`);
    console.log("====================================");
  } catch (error) {
    console.error("\nEXPORT GAGAL!");
    console.error("Pesan error:", error.message);
    process.exitCode = 1;
  }
}

// Jalankan proses export
exportSPB();
