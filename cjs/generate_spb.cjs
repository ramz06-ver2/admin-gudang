const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const FILENAME = "Monitoring SPB Atiara Ubud Bali Update 13102026 (1).xlsx";

try {
  if (!fs.existsSync(FILENAME)) {
    console.error(`❌ File Excel "${FILENAME}" tidak ditemukan.`);
    process.exit(1);
  }

  console.log(`⏳ Membaca file: ${FILENAME}...`);
  const wb = XLSX.readFile(FILENAME);
  const ws = wb.Sheets[wb.SheetNames[0]];

  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const poData = [];
  const spbData = [];
  let poIdCounter = 1;
  let spbIdCounter = 1;
  let lastSpbNo = null;
  let lastPoNo = null;
  let lastSpbTgl = null;

  function formatExcelDate(dateVal) {
    if (!dateVal) return null;
    if (typeof dateVal === 'number') {
      const date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    return String(dateVal).trim();
  }

  for (let i = 4; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length < 5) continue;

    // KARENA KOLOM A KOSONG DI EXCEL, SEMUA INDEX DIGESER -1 AGAR COCOK
    const spbNoRaw = row[0];
    const spbTglRaw = row[1];
    const noBarangRaw = row[2];
    const namaBarang = row[3];
    const ukuranRaw = row[4];
    const qtyMinta = parseInt(row[5]) || 0;
    const satuanRaw = row[6];
    const poNoRaw = row[7];
    const poTglRaw = row[8];
    const supplierRaw = row[9];
    const statusVal = row[10] ? String(row[10]).trim() : "BELUM DATANG";
    const merkRaw = row[11];
    const spesifikasiRaw = row[12];
    const lokasiRaw = row[13];
    const rencanaRaw = row[14];
    const tglDatangRaw = row[16];
    const keteranganRaw = row[21];

    if (!namaBarang) continue; 

    if (spbNoRaw) lastSpbNo = String(spbNoRaw).trim();
    if (poNoRaw) lastPoNo = String(poNoRaw).trim();
    if (spbTglRaw) lastSpbTgl = formatExcelDate(spbTglRaw);

    const spbNo = lastSpbNo;
    const poNo = lastPoNo;
    const spbTgl = lastSpbTgl;
    const poTgl = formatExcelDate(poTglRaw); 
    const tglDatang = formatExcelDate(tglDatangRaw);

    let currentPoId = null;
    if (poNo && poNo !== 'null' && poNo !== '-' && poNo !== 'false') {
      currentPoId = poIdCounter;
      poData.push({
        id: currentPoId,
        no_po: poNo,
        no_spb: spbNo || null,
        no_barang_di_po: noBarangRaw ? String(noBarangRaw).trim() : null,
        tanggal_po: poTgl,
        supplier: supplierRaw ? String(supplierRaw).trim() : null,
        kode_barang: null,
        nama_barang: String(namaBarang).trim(),
        merk: merkRaw ? String(merkRaw).trim() : null,
        spesifikasi_barang: spesifikasiRaw ? String(spesifikasiRaw).trim() : null,
        keterangan: keteranganRaw ? String(keteranganRaw).trim() : null
      });
      poIdCounter++;
    }

    spbData.push({
      id: spbIdCounter,
      no_spb: spbNo || "UNKNOWN",
      tanggal_pembuatan_spb: spbTgl,
      kode_barang: null,
      nama_barang: String(namaBarang).trim(),
      jumlah_permintaan: qtyMinta,
      satuan: satuanRaw ? String(satuanRaw).trim() : null,
      merk: merkRaw ? String(merkRaw).trim() : null,
      spesifikasi_teknis: spesifikasiRaw ? String(spesifikasiRaw).trim() : null,
      lokasi_pemasangan: lokasiRaw ? String(lokasiRaw).trim() : null,
      rencana_pemasangan: rencanaRaw ? String(rencanaRaw).trim() : null,
      keterangan: keteranganRaw ? String(keteranganRaw).trim() : null,
      po_id: currentPoId,
      no_po: currentPoId ? poNo : null,
      tanggal_po: currentPoId ? poTgl : null,
      status: statusVal === "false" ? "BELUM DATANG" : statusVal,
      tanggal_datang: tglDatang
    });
    
    spbIdCounter++;
  }

  fs.writeFileSync(path.join(__dirname, "data_po_final.json"), JSON.stringify(poData, null, 2), "utf-8");
  fs.writeFileSync(path.join(__dirname, "data_spb_final.json"), JSON.stringify(spbData, null, 2), "utf-8");

  console.log(`✅ BERHASIL MEMPERBAIKI DATA JSON!`);
  console.log(`Menghasilkan ${poData.length} data PO ke 'data_po_final.json'`);
  console.log(`Menghasilkan ${spbData.length} data SPB ke 'data_spb_final.json'`);

} catch (error) {
  console.error("❌ Terjadi kesalahan:", error.message);
}