// File: cjs/filter_po.cjs
const fs = require('fs');
const path = require('path');

// Menggunakan file JSON terbaru yang Anda sebutkan
const inputFilePath = path.join(__dirname, 'data_spb_atiara_21102026.json');
const outputFilePath = path.join(__dirname, 'data_po_filtered.json');

try {
    console.log('Membaca data sumber...');
    const rawData = fs.readFileSync(inputFilePath, 'utf8');
    const originalData = JSON.parse(rawData);

    console.log('Memfilter data PO dan menghubungkan id_spb...');
    const filteredData = [];
    let idCounter = 1; // Membuat ID baru berurutan khusus untuk tabel PO

    for (const item of originalData) {
        // HANYA MASUKKAN JIKA po_no ADA ISINYA (Bukan null atau string kosong)
        if (item.po_no) {
            filteredData.push({
                id: idCounter++,                  // ID unik untuk tabel PO
                no_po: item.po_no,
                tanggal_po: item.po_tgl,
                nama_barang_po: item.nama_barang,
                nama_supplier: item.supplier,
                id_spb: item.id,                  // LINK KE "ID" BARANG DI TABEL SPB
                material_datang_tgl: item.material_datang_tgl,
                material_datang_qty: item.material_datang_qty,
                material_datang_satuan: item.material_datang_unit,
                id_surat_jalan: null,             // Disiapkan kosong
                keterangan: item.keterangan
            });
        }
    }

    fs.writeFileSync(outputFilePath, JSON.stringify(filteredData, null, 4), 'utf8');
    console.log(`Berhasil! Ditemukan ${filteredData.length} barang yang memiliki PO.`);
    console.log('Data telah disimpan ke data_po_filtered.json');

} catch (error) {
    console.error('Terjadi kesalahan:', error.message);
}