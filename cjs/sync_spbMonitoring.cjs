const fs = require("fs");
const path = require("path");

// Fungsi untuk membaca file JSON
function bacaDataJson(namaFile) {
  const lokasiFile = path.join(__dirname, namaFile);
  if (fs.existsSync(lokasiFile)) {
    const dataMentah = fs.readFileSync(lokasiFile, "utf8");
    return JSON.parse(dataMentah);
  }
  console.log(`Peringatan: File ${namaFile} tidak ditemukan.`);
  return [];
}

function sinkronisasiMonitoring() {
  console.log("🚀 Memulai proses sinkronisasi daftar monitoring...");

  // 1. Baca semua data JSON
  const dataSpb = bacaDataJson("table_spb.json");
  const dataPo = bacaDataJson("table_po.json");
  const dataSj = bacaDataJson("table_surat_jalan.json");
  const dataMonitoring = bacaDataJson("table_daftar_monitoring.json");

  if (dataMonitoring.length === 0) {
    console.error(
      "❌ Proses dihentikan karena data monitoring kosong atau file tidak ada.",
    );
    return;
  }

  // 2. Buat Lookup Table untuk pencarian cepat
  const mapSpb = new Map(dataSpb.map((item) => [item.id.toString(), item]));
  const mapPo = new Map(dataPo.map((item) => [item.id.toString(), item]));

  // Untuk Surat Jalan, biasanya kita cocokkan berdasarkan id_po atau id_spb yang ada di dataSj
  const mapSj = new Map();
  dataSj.forEach((item) => {
    // Asumsi jika surat jalan nyambung ke PO atau SPB, kita bisa lacak
    if (item.id_po) mapSj.set(`po_${item.id_po}`, item);
    if (item.id_spb) mapSj.set(`spb_${item.id_spb}`, item);
  });

  let jumlahUpdate = 0;

  // 3. Proses penyesuaian (sinkronisasi) data per baris monitoring
  const updatedMonitoring = dataMonitoring.map((monitoringRow) => {
    let isUpdated = false;

    // ---- Sinkronisasi dengan tabel SPB ----
    // Asumsi: Di tabel daftar_monitoring ada cara menghubungkan ke SPB asli (misal spb_no atau kita gunakan mapping manual jika ada kolom id_spb_asli. Karena struktur monitoring Anda tidak punya foreign key yang jelas ke tabel id spb, saya contohkan by No SPB & Nama barang)
    const spbMatch = dataSpb.find(
      (s) =>
        s.no_spb === monitoringRow.spb_no &&
        s.nama_barang_spb === monitoringRow.nama_barang,
    );

    if (spbMatch) {
      if (monitoringRow.spb_tgl !== spbMatch.tgl_spb) {
        monitoringRow.spb_tgl = spbMatch.tgl_spb;
        isUpdated = true;
      }
      if (monitoringRow.permintaan_qty !== spbMatch.qty_permintaan) {
        monitoringRow.permintaan_qty = spbMatch.qty_permintaan;
        isUpdated = true;
      }
    } else if (monitoringRow.spb_no) {
      // Skenario khusus Anda: "data yang ada no spbnya tapi di tabel spb tidak ada datanya, maka disesuaikan datanya mengikuti tabel spb" (artinya dikosongkan/null-kan karena di SPB aslinya sudah dihapus/tidak ada)
      const spbExist = dataSpb.some((s) => s.no_spb === monitoringRow.spb_no);
      if (!spbExist) {
        monitoringRow.spb_no = null;
        monitoringRow.spb_tgl = null;
        isUpdated = true;
      }
    }

    // ---- Sinkronisasi dengan tabel PO ----
    // Mencari PO berdasarkan No PO
    if (monitoringRow.po_no) {
      const poMatch = dataPo.find(
        (p) =>
          p.no_po === monitoringRow.po_no &&
          p.nama_barang_po === monitoringRow.nama_barang,
      );
      if (poMatch) {
        if (monitoringRow.po_tgl !== poMatch.tanggal_po) {
          monitoringRow.po_tgl = poMatch.tanggal_po;
          isUpdated = true;
        }
        if (monitoringRow.supplier !== poMatch.nama_supplier) {
          monitoringRow.supplier = poMatch.nama_supplier;
          isUpdated = true;
        }
      } else {
        // Jika di daftar_monitoring ada no PO tapi di tabel asli PO tidak ada, maka kosongkan
        const poExist = dataPo.some((p) => p.no_po === monitoringRow.po_no);
        if (!poExist) {
          monitoringRow.po_no = null;
          monitoringRow.po_tgl = null;
          monitoringRow.supplier = null;
          isUpdated = true;
        }
      }
    }

    // ---- Sinkronisasi Data Kedatangan (Surat Jalan/Material Datang) ----
    // Jika status PO ada, kita cek barang datangnya dari data PO atau Surat jalan
    const poDataUntukSJ = dataPo.find(
      (p) =>
        p.no_po === monitoringRow.po_no &&
        p.nama_barang_po === monitoringRow.nama_barang,
    );
    if (poDataUntukSJ && poDataUntukSJ.material_datang_tgl) {
      if (
        monitoringRow.material_datang_tgl !== poDataUntukSJ.material_datang_tgl
      ) {
        monitoringRow.material_datang_tgl = poDataUntukSJ.material_datang_tgl;
        isUpdated = true;
      }
      if (
        monitoringRow.material_datang_qty !== poDataUntukSJ.material_datang_qty
      ) {
        monitoringRow.material_datang_qty = poDataUntukSJ.material_datang_qty;
        isUpdated = true;
      }
    }

    if (isUpdated) jumlahUpdate++;
    return monitoringRow;
  });

  // 4. Simpan ke file baru agar data lama tidak hilang/rusak
  const namaFileBaru = "table_daftar_monitoring_updated.json";
  fs.writeFileSync(
    path.join(__dirname, namaFileBaru),
    JSON.stringify(updatedMonitoring, null, 2),
    "utf8",
  );

  console.log(
    `✅ Sinkronisasi berhasil! ${jumlahUpdate} baris data disesuaikan.`,
  );
  console.log(`💾 Data disimpan ke dalam file: ${namaFileBaru}`);
}

sinkronisasiMonitoring();
