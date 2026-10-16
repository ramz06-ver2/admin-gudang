// Load dotenv agar bisa membaca file .env di root project
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ==========================================
// 1. Konfigurasi Supabase menggunakan .env
// ==========================================
// Kita ambil dari VITE_SUPABASE_URL dan VITE_SUPABASE_KEY
const SUPABASE_URL = process.env.VITE_SUPABASE_URL; 
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;

// Validasi jika .env kosong atau belum terisi
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ ERROR: VITE_SUPABASE_URL atau VITE_SUPABASE_KEY tidak ditemukan di file .env!");
  console.log("Pastikan file .env ada di folder root project dan berisi kredensial yang benar.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function insertData() {
  try {
    // ==========================================
    // 2. Tambahkan Bitumen Tape ke tabel 'barang'
    // ==========================================
    console.log("⏳ Memeriksa/menambahkan Bitumen Tape ke tabel 'barang'...");
    
    const { data: existingBitumen, error: checkError } = await supabase
      .from('barang')
      .select('kode')
      .eq('kode', 'BITUMEN-001')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
         // PGRST116 = Data tidak ditemukan (ini wajar). Error lain berarti ada masalah koneksi/tabel
         console.error('❌ Gagal cek barang:', checkError.message);
    }

    if (!existingBitumen) {
      const { error: insertBitumenError } = await supabase
        .from('barang')
        .insert({
          kode: 'BITUMEN-001',
          nama: 'Bitumen Tape',
          ukuran: '100mm x 10m',
          spesifikasi: null,
          satuan: 'roll',
          stok: 0,
          kategori: 'Material'
        });

      if (insertBitumenError) {
        console.error('❌ Gagal menambahkan Bitumen Tape:', insertBitumenError.message);
      } else {
        console.log('✅ Bitumen Tape (BITUMEN-001) berhasil ditambahkan ke tabel barang!');
      }
    } else {
      console.log('ℹ️ Bitumen Tape sudah ada di tabel barang, melewati proses insert.');
    }

    // ==========================================
    // 3. Insert ke tabel 'barang_masuk'
    // ==========================================
    const jsonPath = path.join(__dirname, 'gabungan_masuk_final.json');
    if (!fs.existsSync(jsonPath)) {
        console.error(`❌ File tidak ditemukan: ${jsonPath}`);
        return;
    }

    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const dataMasuk = JSON.parse(rawData);

    console.log(`\n⏳ Menyiapkan ${dataMasuk.length} baris data barang masuk...`);

    const formattedData = dataMasuk.map((item) => {
      if (item.nama_barang.toLowerCase() === 'bitumen tape') {
        item.kode_barang = 'BITUMEN-001';
        item.satuan_barang = 'roll';
        item.kategori = 'Material';
      }

      return {
        kode_barang: item.kode_barang,
        nama_barang: item.nama_barang,
        ukuran_barang: item.ukuran_barang,
        spesifikasi_barang: item.spesifikasi_barang,
        satuan_barang: item.satuan_barang,
        kategori: item.kategori,
        jumlah_barang_masuk: item.jumlah_barang_masuk,
        tanggal_pengiriman: item.tanggal_pengiriman,
        keterangan: item.keterangan
      };
    });

    const { data, error } = await supabase
      .from('barang_masuk')
      .insert(formattedData)
      .select();

    if (error) {
      console.error('❌ Terjadi kesalahan saat insert data masuk:', error.message);
      return;
    }

    console.log(`✅ BERHASIL! ${data.length} data sukses masuk ke tabel 'barang_masuk'.`);

  } catch (err) {
    console.error('❌ Gagal menjalankan skrip:', err);
  }
}

insertData();