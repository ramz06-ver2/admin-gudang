const fs = require("node:fs");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");

require("dotenv").config({
  path: path.join(__dirname, "../.env.local"),
});

// ================================
// KONFIGURASI
// ================================
const OUTPUT_DIR = path.join(__dirname, "spb");
const TABLE_NAME = "spb";
const PAGE_SIZE = 1000;
const GROUP_SIZE = 10; // Setiap folder berisi maksimal 10 file SPB

// ================================
// EXPORT DATA SPB
// ================================
async function exportSPB() {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "VITE_SUPABASE_URL atau VITE_SUPABASE_KEY tidak ditemukan di .env.local"
      );
    }

    console.log("Konfigurasi Supabase ditemukan.");
    console.log(`Mengambil data tabel ${TABLE_NAME}...`);

    const supabase = createClient(supabaseUrl, supabaseKey);

    const allData = [];
    let offset = 0;

    // ================================
    // 1. AMBIL SELURUH DATA
    // ================================
    while (true) {
      console.log(
        `Mengambil baris ${offset + 1} sampai ${offset + PAGE_SIZE}...`
      );

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .order("id", { ascending: true }) // Tetap pakai ID untuk paginasi
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw new Error(`Gagal mengambil data: ${error.message}`);
      if (!data || data.length === 0) break;

      allData.push(...data);
      console.log(`Data halaman ini: ${data.length} | Total: ${allData.length}`);

      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    // ================================
    // 2. KELOMPOKKAN DATA BERDASARKAN NO_SPB
    // ================================
    console.log("\nMengelompokkan data berdasarkan No SPB...");
    const groupedData = {};

    allData.forEach((item) => {
      const noSpb = item.no_spb || "Tanpa-SPB";
      if (!groupedData[noSpb]) {
        groupedData[noSpb] = [];
      }
      groupedData[noSpb].push(item);
    });

    // Ambil daftar No SPB yang unik, lalu urutkan secara natural (1A, 1B, 2, 10...)
    const uniqueSpbList = Object.keys(groupedData);
    uniqueSpbList.sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );

    // Urutkan isi barang di dalam masing-masing SPB berdasarkan no_barang_di_spb
    for (const spb of uniqueSpbList) {
      groupedData[spb].sort((a, b) => {
        const barangA = String(a.no_barang_di_spb || "");
        const barangB = String(b.no_barang_di_spb || "");
        return barangA.localeCompare(barangB, undefined, { numeric: true, sensitivity: "base" });
      });
    }

    // ================================
    // 3. BUAT FOLDER & SIMPAN FILE
    // ================================
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    let totalFiles = 0;
    let counter = 1; // Counter untuk membagi folder (setiap 10 file)

    for (const noSpb of uniqueSpbList) {
      // Bersihkan no_spb dari karakter yang tidak valid untuk nama file
      const safeNoSpb = String(noSpb).replace(/[^a-zA-Z0-9-_]/g, "_");

      // Tentukan Folder berdasarkan counter (misal: file ke 1-10 masuk folder "1-10")
      const startId = Math.floor((counter - 1) / GROUP_SIZE) * GROUP_SIZE + 1;
      const endId = startId + GROUP_SIZE - 1;
      const folderName = `${startId}-${endId}`;
      const folderPath = path.join(OUTPUT_DIR, folderName);

      fs.mkdirSync(folderPath, { recursive: true });

      // Nama file: spb-1A.json
      const fileName = `spb-${safeNoSpb}.json`;
      const filePath = path.join(folderPath, fileName);

      // Simpan array dari data barang ke dalam satu file
      fs.writeFileSync(
        filePath,
        JSON.stringify(groupedData[noSpb], null, 2),
        "utf8"
      );

      totalFiles++;
      console.log(`Berhasil (${groupedData[noSpb].length} data): spb/${folderName}/${fileName}`);

      counter++;
    }

    // ================================
    // INFORMASI HASIL EXPORT
    // ================================
    console.log("\n====================================");
    console.log("EXPORT SPB BERHASIL");
    console.log("====================================");
    console.log(`Nama tabel     : ${TABLE_NAME}`);
    console.log(`Total baris DB : ${allData.length}`);
    console.log(`Total file SPB : ${totalFiles} file`);
    console.log(`No SPB awal    : ${uniqueSpbList.length ? uniqueSpbList[0] : "-"}`);
    console.log(`No SPB akhir   : ${uniqueSpbList.length ? uniqueSpbList[uniqueSpbList.length - 1] : "-"}`);
    console.log(`Folder hasil   : ${OUTPUT_DIR}`);
    console.log("====================================");

  } catch (error) {
    console.error("\nEXPORT GAGAL!");
    console.error("Pesan error:", error.message);
    process.exitCode = 1;
  }
}

// Jalankan export
exportSPB();