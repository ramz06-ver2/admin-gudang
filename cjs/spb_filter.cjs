// File: cjs/filter_spb.cjs
const fs = require('fs');
const path = require('path');

const inputFilePath = path.join(__dirname, 'data_spb_atiara_21102026.json');
const outputFilePath = path.join(__dirname, 'data_spb_filtered.json');

try {
    console.log('Membaca data sumber...');
    const rawData = fs.readFileSync(inputFilePath, 'utf8');
    const originalData = JSON.parse(rawData);

    console.log('Memfilter dan memetakan ulang kolom...');
    const filteredData = originalData.map(item => {
        return {
            id: item.id,
            no_spb: item.spb_no,
            tgl_spb: item.spb_tgl,
            no_barang_di_spb: item.no_barang_di_spb,
            nama_barang_spb: item.nama_barang,
            ukuran: item.ukuran,
            qty_permintaan: item.permintaan_qty,
            satuan: item.permintaan_unit,
            id_po: item.po_no,
            merk: item.merk,
            spesifikasi_teknis: item.spesifikasi_teknis,
            lokasi_pemasangan: item.lokasi_pemasangan,
            rencana_pemasangan: item.rencana_pemasangan,
            material_datang_tgl: item.material_datang_tgl,
            material_datang_qty: item.material_datang_qty,
            material_datang_satuan: item.material_datang_unit,
            keterangan: item.keterangan
        };
    });

    fs.writeFileSync(outputFilePath, JSON.stringify(filteredData, null, 4), 'utf8');
    console.log(`Berhasil! ${filteredData.length} baris data telah difilter dan disimpan ke data_spb_filtered.json`);

} catch (error) {
    console.error('Terjadi kesalahan:', error.message);
}