require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Mengambil konfigurasi Supabase dari file .env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL; 
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ ERROR: VITE_SUPABASE_URL atau VITE_SUPABASE_KEY tidak ditemukan di file .env!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchAndReplaceProducts() {
  try {
    console.log("⏳ Mengambil data dari tabel 'barang' di Supabase...");
    
    // Mengambil semua data dari tabel barang, diurutkan berdasarkan ID
    const { data, error } = await supabase
      .from('barang')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error("❌ Gagal mengambil data dari Supabase:", error.message);
      return;
    }

    console.log(`✅ Berhasil menarik ${data.length} data barang dari database.`);

    // Path target file products.json
    const jsonPath = path.join(__dirname, 'products.json');

    // Menimpa file products.json dengan data terbaru (format JSON yang rapi)
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`💾 File 'products.json' berhasil diperbarui/ditimpa!`);
    
  } catch (err) {
    console.error("❌ Terjadi kesalahan pada saat eksekusi:", err);
  }
}

fetchAndReplaceProducts();