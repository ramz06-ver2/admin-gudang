// transform-spb.cjs
const fs = require("fs");
const path = require("path");

/**
 * Transform array data SPB monitoring ke format target.
 * Field yang tidak ada di source akan diisi null.
 */
function transformSpbMonitoring(data) {
  if (!Array.isArray(data)) return [];

  return data.map((item) => ({
    id: item.id ?? null,
    no_spb: item.spb_no ?? null,
    tgl_spb: item.spb_tgl ?? null,
    no_barang_di_spb: item.no_barang_di_spb ?? null,
    nama_barang_spb: item.nama_barang ?? null,
    ukuran: item.ukuran ?? null,
    qty_permintaan: item.permintaan_qty ?? null,
    satuan: item.permintaan_unit ?? null,
    merk: item.merk ?? null,
    spesifikasi_teknis: item.spesifikasi_teknis ?? null,
    lokasi_pemasangan: item.lokasi_pemasangan ?? null,
    rencana_pemasangan: item.rencana_pemasangan ?? null,
    material_datang_tgl: item.material_datang_tgl ?? null,
    material_datang_qty: item.material_datang_qty ?? null,
    material_datang_satuan: item.material_datang_unit ?? null,
    keterangan: item.keterangan ?? null,
    created_at: item.created_at ?? null,
    id_po: item.id_po ?? null,
    judul_spb: item.judul_spb ?? null,
  }));
}

module.exports = { transformSpbMonitoring };

// Jika dijalankan langsung: node transform-spb.cjs
if (require.main === module) {
  const inputPath = path.join(__dirname, "add_spbMonitoring.json");
  const outputPath = path.join(__dirname, "add_spb.json");

  const raw = fs.readFileSync(inputPath, "utf8");
  const source = JSON.parse(raw);
  const result = transformSpbMonitoring(source);

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf8");
  console.log(`Berhasil menulis ${result.length} baris ke ${outputPath}`);
}
