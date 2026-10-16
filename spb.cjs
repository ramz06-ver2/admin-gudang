require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL; 
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ ERROR: VITE_SUPABASE_URL atau VITE_SUPABASE_KEY tidak ditemukan di .env!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchAndSaveJSON() {
  try {
    console.log("⏳ Mengambil data dari tabel 'po'...");
    const { data: poData, error: poError } = await supabase
      .from('po')
      .select('*')
      .order('id', { ascending: true });

    if (poError) throw poError;

    console.log("⏳ Mengambil data dari tabel 'spb'...");
    const { data: spbData, error: spbError } = await supabase
      .from('spb')
      .select('*')
      .order('id', { ascending: true });

    if (spbError) throw spbError;

    // Simpan ke file po.json
    const poPath = path.join(__dirname, 'po.json');
    fs.writeFileSync(poPath, JSON.stringify(poData, null, 2), 'utf-8');
    console.log(`✅ File 'po.json' berhasil dibuat! (${poData.length} data)`);

    // Simpan ke file spb.json
    const spbPath = path.join(__dirname, 'spb.json');
    fs.writeFileSync(spbPath, JSON.stringify(spbData, null, 2), 'utf-8');
    console.log(`✅ File 'spb.json' berhasil dibuat! (${spbData.length} data)`);

  } catch (err) {
    console.error("❌ Terjadi kesalahan:", err.message);
  }
}

fetchAndSaveJSON();