// File: cjs/filter_surat_jalan.cjs
const fs = require('fs');
const path = require('path');

const inputFilePath = path.join(__dirname, 'barang_masuk.json');
const outputFilePath = path.join(__dirname, 'surat_jalan.json');

try {
    console.log('Membaca data barang_masuk.json...');
    const rawData = fs.readFileSync(inputFilePath, 'utf8');
    const originalData = JSON.parse(rawData);

    // 1. Ambil semua tanggal unik dan urutkan dari yang terlama ke terbaru
    const uniqueDates = [...new Set(originalData.map(item => item.tanggal_pengiriman))].filter(Boolean);
    uniqueDates.sort((a, b) => new Date(a) - new Date(b));

    // 2. Buat mapping tanggal ke nomor surat jalan (1, 2, 3...)
    const noSuratJalanMap = {};
    uniqueDates.forEach((date, index) => {
        noSuratJalanMap[date] = index + 1;
    });

    console.log('Mapping Nomor Surat Jalan berdasarkan tanggal:', noSuratJalanMap);

    // 3. Mapping data ke struktur tabel surat_jalan
    let idCounter = 1;
    const filteredData = originalData.map(item => {
        return {
            id: idCounter++,
            no_surat_jalan: item.tanggal_pengiriman ? noSuratJalanMap[item.tanggal_pengiriman] : null,
            kode_barang: item.kode_barang,
            nama_barang: item.nama_barang,
            ukuran: item.ukuran_barang,
            satuan: item.satuan_barang,
            spesifikasi: item.spesifikasi_barang,
            jumlah: item.jumlah_barang_masuk,
            tanggal_surat_jalan: item.tanggal_pengiriman,
            id_spb: null, // Disiapkan kosong untuk relasi nanti
            id_po: null,  // Disiapkan kosong
            material_datang_tgl: null,
            material_datang_qty: null,
            material_datang_satuan: null,
            keterangan: item.keterangan
        };
    });

    // 4. Simpan ke file JSON baru
    fs.writeFileSync(outputFilePath, JSON.stringify(filteredData, null, 4), 'utf8');
    console.log(`\nBerhasil! ${filteredData.length} baris data telah diproses dan disimpan ke surat_jalan.json`);

} catch (error) {
    console.error('Terjadi kesalahan:', error.message);
}