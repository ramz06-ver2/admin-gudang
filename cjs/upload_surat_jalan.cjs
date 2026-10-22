// File: cjs/upload_surat_jalan.cjs
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

// Membaca konfigurasi dari root folder
const envPathLocal = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envPathLocal)) {
  dotenv.config({ path: envPathLocal });
} else {
  dotenv.config({ path: envPath });
}

// Scanner variabel env
const envKeys = Object.keys(process.env);
const urlKeyName = envKeys.find(k => k.includes("SUPABASE_URL"));
const keyKeyName = envKeys.find(k => k.includes("SUPABASE") && (k.includes("KEY") || k.includes("ANON") || k.includes("SERVICE")));

const SUPABASE_URL = urlKeyName ? process.env[urlKeyName] : null;
// Paksa mencari Service Key terlebih dahulu
const SUPABASE_KEY = 
  process.env.SUPABASE_SERVICE_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  (keyKeyName ? process.env[keyKeyName] : null);

const TABLE_NAME = "surat_jalan";

async function uploadSuratJalan() {
  const isServiceKey = (SUPABASE_KEY === process.env.SUPABASE_SERVICE_KEY) || (SUPABASE_KEY === process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log(`Menghubungkan ke Supabase...`);
  console.log(`- Status KEY : ${isServiceKey ? "SERVICE ROLE KEY ✅" : "ANON KEY ⚠️"}`);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("[FATAL ERROR] Kredensial URL atau KEY tidak ditemukan.");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const jsonPath = path.join(__dirname, 'surat_jalan.json');
    console.log('\nMembaca file surat_jalan.json...');
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(rawData);

    console.log(`Total data siap upload ke tabel "${TABLE_NAME}": ${data.length} baris.`);

    // Chunking per 100 baris agar aman
    const chunkSize = 100;
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      
      const { error } = await supabase
        .from(TABLE_NAME)
        .upsert(chunk);

      if (error) {
        console.error(`[ERROR] Gagal upload baris ${i + 1} - ${i + chunk.length}:`, error.message);
      } else {
        console.log(`[SUCCESS] Berhasil upload baris ${i + 1} sampai ${i + chunk.length}`);
      }
    }

    console.log('\n--- SELESAI! ---');
    console.log(`Seluruh data berhasil dimasukkan ke tabel "${TABLE_NAME}".`);

  } catch (err) {
    console.error('\n[SYSTEM ERROR] Terjadi kesalahan:', err.message);
  }
}

uploadSuratJalan();