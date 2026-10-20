require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Mengambil kredensial Supabase dari file .env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL; 
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ ERROR: VITE_SUPABASE_URL atau VITE_SUPABASE_KEY tidak ditemukan di file .env!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchAllBarang() {
  try {
    console.log("⏳ Mengambil semua data dari tabel 'barang' di Supabase...");
    
    // Mengambil semua baris data dan mengurutkannya berdasarkan ID
    const { data, error } = await supabase
      .from('barang')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      throw error;
    }

    // Menentukan path dan nama file JSON output
    const outputPath = path.join(__dirname, 'barang_all.json');
    
    // Menulis data ke file JSON dengan format yang rapi (indentasi 2 spasi)
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`✅ BERHASIL! Berhasil menarik ${data.length} baris data barang.`);
    console.log(`💾 Seluruh data telah disimpan ke dalam file 'barang_all.json'.`);
    
  } catch (err) {
    console.error("❌ Terjadi kesalahan saat menarik data:", err.message);
  }
}

fetchAllBarang();