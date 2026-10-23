const fs = require('fs');
const path = require('path'); // Tambahkan modul path
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Kredensial tidak ditemukan di .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportTablesToJson() {
  console.log("Memulai proses ekspor data...");

  // Kunci keakuratannya ada di sini: gabungkan folder tempat script ini berada (__dirname) dengan nama file
  const poFile = path.join(__dirname, 'table_po.json');
  const spbFile = path.join(__dirname, 'table_spb.json');

  try {
    console.log("📥 Mengambil data dari tabel 'po'...");
    const { data: poData, error: poError } = await supabase.from('po').select('*');
    if (poError) throw poError;
    
    fs.writeFileSync(poFile, JSON.stringify(poData, null, 2), 'utf8');
    console.log(`✅ Berhasil menyimpan table_po.json di: ${poFile}`);

    console.log("📥 Mengambil data dari tabel 'spb'...");
    const { data: spbData, error: spbError } = await supabase.from('spb').select('*');
    if (spbError) throw spbError;
    
    fs.writeFileSync(spbFile, JSON.stringify(spbData, null, 2), 'utf8');
    console.log(`✅ Berhasil menyimpan table_spb.json di: ${spbFile}`);

    console.log("🎉 Proses ekspor selesai!");

  } catch (error) {
    console.error("❌ Terjadi kesalahan:", error.message || error);
  }
}

exportTablesToJson();