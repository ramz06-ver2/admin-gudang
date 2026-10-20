require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Inisialisasi Supabase Client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL; 
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY; 

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ ERROR: VITE_SUPABASE_URL atau VITE_SUPABASE_KEY tidak ditemukan di .env!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function resetAndInsertData() {
  try {
    // 2. Tentukan nama file JSON yang akan dibaca
    const poPath = path.join(__dirname, 'data_po_final.json');
    const spbPath = path.join(__dirname, 'data_spb_final.json');

    if (!fs.existsSync(poPath) || !fs.existsSync(spbPath)) {
      console.error(`❌ ERROR: File JSON tidak ditemukan. Pastikan 'data_po_3.json' dan 'data_spb_3.json' ada di folder ini.`);
      return;
    }

    const poData = JSON.parse(fs.readFileSync(poPath, 'utf-8'));
    const spbData = JSON.parse(fs.readFileSync(spbPath, 'utf-8'));

    console.log("⚠️ PERINGATAN: Memulai proses penghapusan data lama...");

    // 3. MENGHAPUS SEMUA DATA LAMA (DELETE FROM TABLE)
    // Hapus data SPB terlebih dahulu karena bergantung (foreign key) pada PO
    console.log("🧹 Menghapus semua data dari tabel 'spb'...");
    const { error: deleteSpbError } = await supabase
      .from('spb')
      .delete()
      .neq('id', 0); // Menghapus baris dimana ID != 0 (menghapus semua)

    if (deleteSpbError) throw new Error(`Gagal hapus data SPB: ${deleteSpbError.message}`);

    console.log("🧹 Menghapus semua data dari tabel 'po'...");
    const { error: deletePoError } = await supabase
      .from('po')
      .delete()
      .neq('id', 0);

    if (deletePoError) throw new Error(`Gagal hapus data PO: ${deletePoError.message}`);

    console.log("✅ Data lama berhasil dibersihkan!");
    console.log("⏳ Memulai proses penyisipan data baru...");

    // 4. INSERT DATA PO BARU
    if (poData.length > 0) {
      console.log(`📥 Menyisipkan ${poData.length} baris data ke tabel 'po'...`);
      const { error: insertPoError } = await supabase
        .from('po')
        .insert(poData);
      
      if (insertPoError) throw new Error(`Gagal insert PO: ${insertPoError.message}`);
      console.log("✅ Data PO berhasil dimasukkan.");
    }

    // 5. INSERT DATA SPB BARU
    if (spbData.length > 0) {
      console.log(`📥 Menyisipkan ${spbData.length} baris data ke tabel 'spb'...`);
      const { error: insertSpbError } = await supabase
        .from('spb')
        .insert(spbData);
      
      if (insertSpbError) throw new Error(`Gagal insert SPB: ${insertSpbError.message}`);
      console.log("✅ Data SPB berhasil dimasukkan.");
    }

    console.log("🎉 SELURUH PROSES SELESAI DENGAN SUKSES!");

  } catch (error) {
    console.error("\n❌ TERJADI KESALAHAN:");
    console.error(error.message);
  }
}

resetAndInsertData();