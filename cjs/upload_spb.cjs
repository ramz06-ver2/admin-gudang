// File: cjs/upload_spb.cjs
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_KEY ||
  process.env.VITE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "[FATAL ERROR] Supabase URL atau Key tidak ditemukan di file .env!",
  );
  process.exit(1);
}

console.log(`Menghubungkan ke Supabase di: ${SUPABASE_URL}`);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function uploadSpb() {
  try {
    const jsonPath = path.join(__dirname, "add_spb.json");
    console.log("Membaca file add_spb.json...");
    const rawData = fs.readFileSync(jsonPath, "utf8");
    const data = JSON.parse(rawData);

    console.log(
      `Total data siap di-upload ke tabel "spb": ${data.length} baris.`,
    );

    // Upload per 100 baris agar API tidak error (chunking)
    const chunkSize = 100;

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);

      const { error } = await supabase.from("spb").upsert(chunk);

      if (error) {
        console.error(
          `[ERROR] Gagal upload baris ${i + 1} - ${i + chunk.length}:`,
          error.message,
        );
      } else {
        console.log(
          `[SUCCESS] Berhasil upload baris ${i + 1} sampai ${i + chunk.length}`,
        );
      }
    }

    console.log("\n--- SELESAI! ---");
    console.log('Seluruh data JSON telah berhasil dimasukkan ke tabel "spb".');
  } catch (err) {
    console.error("\n[SYSTEM ERROR] Terjadi kesalahan:", err.message);
  }
}

uploadSpb();
