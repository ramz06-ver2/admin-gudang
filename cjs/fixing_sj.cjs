require("dotenv").config(); // Membaca file .env
const { createClient } = require("@supabase/supabase-js");

// Ambil URL dan KEY dari .env (menggunakan prefix VITE_)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Error: VITE_SUPABASE_URL atau VITE_SUPABASE_KEY tidak ditemukan di file .env",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateData() {
  try {
    console.log("Memulai proses update...");
    const noSuratJalan = 3;
    const tanggalDatang = "2026-10-24";

    // 1. Ambil data dari surat_jalan yang akan diupdate
    // Kita butuh id, id_po, id_spb, jumlah, dan satuan
    const { data: suratJalanData, error: fetchError } = await supabase
      .from("surat_jalan")
      .select("id, id_po, id_spb, jumlah, satuan")
      .eq("no_surat_jalan", noSuratJalan);

    if (fetchError) throw fetchError;
    if (!suratJalanData || suratJalanData.length === 0) {
      console.log(
        `Tidak ada data ditemukan untuk no_surat_jalan = ${noSuratJalan}`,
      );
      return;
    }

    console.log(
      `Ditemukan ${suratJalanData.length} barang di surat jalan. Memproses update...`,
    );

    // 2. Loop melalui setiap barang di surat jalan
    for (const item of suratJalanData) {
      // A. Update tabel surat_jalan
      const { error: errorSJ } = await supabase
        .from("surat_jalan")
        .update({
          material_datang_tgl: tanggalDatang,
          material_datang_qty: item.jumlah,
          material_datang_satuan: item.satuan,
        })
        .eq("id", item.id);

      if (errorSJ)
        throw new Error(
          `Gagal update surat_jalan ID ${item.id}: ${errorSJ.message}`,
        );

      // B. Update tabel PO (jika id_po tidak null)
      if (item.id_po) {
        const { error: errorPO } = await supabase
          .from("po")
          .update({
            material_datang_tgl: tanggalDatang,
            material_datang_qty: item.jumlah,
            material_datang_satuan: item.satuan,
          })
          .eq("id", item.id_po);

        if (errorPO)
          console.error(`Gagal update PO ID ${item.id_po}:`, errorPO.message);
      }

      // C. Update tabel SPB (jika id_spb tidak null)
      if (item.id_spb) {
        const { error: errorSPB } = await supabase
          .from("spb")
          .update({
            material_datang_tgl: tanggalDatang,
            material_datang_qty: item.jumlah,
            material_datang_satuan: item.satuan,
          })
          .eq("id", item.id_spb);

        if (errorSPB)
          console.error(
            `Gagal update SPB ID ${item.id_spb}:`,
            errorSPB.message,
          );
      }
    }

    console.log("====================================");
    console.log("Proses update selesai dengan sukses!");
    console.log("====================================");
  } catch (error) {
    console.error("Terjadi kesalahan saat memproses data:", error);
  }
}

updateData();
