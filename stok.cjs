require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL; 
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchStokTersedia() {
  try {
    console.log("⏳ Mengambil data barang dengan stok tersedia dari database...");
    
    // Tarik data langsung dari tabel 'barang', tapi abaikan yang stoknya 0
    const { data, error } = await supabase
      .from('barang')
      .select('*')
      .neq('stok', 0) // Filter: stok tidak sama dengan 0
      .order('id', { ascending: true });

    if (error) throw error;

    // Simpan hasilnya
    const outputPath = path.join(__dirname, 'products_tersedia.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`✅ BERHASIL! Ditemukan ${data.length} barang yang stoknya tidak kosong.`);
    console.log(`💾 File 'products_tersedia.json' telah diperbarui.`);

  } catch (err) {
    console.error("❌ Terjadi kesalahan:", err.message);
  }
}

fetchStokTersedia();