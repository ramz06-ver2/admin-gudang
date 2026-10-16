const fs = require('fs');
const path = require('path');

try {
  // 1. Membaca file monitoring_data.json
  const inputPath = path.join(__dirname, 'monitoring_data.json');
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ File ${inputPath} tidak ditemukan.`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(inputPath, 'utf-8');
  const data = JSON.parse(rawData);

  // 2. Memastikan data SPB ada
  if (!data.spb || !Array.isArray(data.spb)) {
    console.error('❌ Data SPB tidak ditemukan di dalam monitoring_data.json.');
    process.exit(1);
  }

  // 3. Menyaring SPB yang statusnya BUKAN "BELUM DATANG"
  //    dan membentuk ulang strukturnya
  const filteredSPB = data.spb
    .filter(item => item.status !== "BELUM DATANG")
    .map((item, index) => {
      // Data asli SPB Anda tidak memiliki 'kode' secara langsung, 
      // jadi kita buat fallback jika kode_barang bernilai null.
      const kode_fallback = `SPB-${item.no_spb}-${item.id}`;
      
      return {
        id: item.id || (index + 1),
        kode: item.kode_barang || kode_fallback, 
        nama: item.nama_barang || "Tanpa Nama",
        ukuran: item.ukuran || null, // Di SPB ukuran sering digabung/tidak ada, kita set null
        spesifikasi: item.spesifikasi_teknis || null,
        satuan: item.satuan || "pcs",
        stok: item.jumlah_permintaan || 0, // Menggunakan jumlah_permintaan sebagai stok
        kategori: "Material", // Default fallback, karena SPB tidak merinci kategori
        created_at: new Date().toISOString() // Waktu digenerate saat script dijalankan
      };
    });

  // 4. Menyimpan hasilnya ke file baru spb_datang.json
  const outputPath = path.join(__dirname, 'spb_datang.json');
  fs.writeFileSync(outputPath, JSON.stringify(filteredSPB, null, 2), 'utf-8');

  console.log(`✅ BERHASIL!`);
  console.log(`Menemukan ${filteredSPB.length} data SPB dengan status selain "BELUM DATANG".`);
  console.log(`Hasil telah disimpan ke file 'spb_datang.json'.`);
  
} catch (error) {
  console.error("❌ Terjadi kesalahan:", error.message);
}