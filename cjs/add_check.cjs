// File: cjs/check_my_work.cjs

const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

// ========================================
// 1. KONFIGURASI ENV
// ========================================
const ROOT_DIR = path.join(__dirname, "..");
dotenv.config({ path: path.join(ROOT_DIR, ".env") });
dotenv.config({ path: path.join(ROOT_DIR, ".env.local"), override: false });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_KEY ||
  process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[FATAL] Supabase URL/Key tidak ditemukan.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// File lokal yang sedang dikerjakan
const FILE_PO = path.join(__dirname, "add_po.json");
const FILE_SPB = path.join(__dirname, "add_spb.json");
const FILE_REPORT = path.join(__dirname, "check_detail_report.log");

// ========================================
// 2. LOGGER & UTILITIES
// ========================================
let reportLines = [];
function log(type, msg) {
  const prefix =
    type === "error"
      ? "❌ [ERROR]"
      : type === "warn"
      ? "⚠️ [WARNING]"
      : "ℹ️ [INFO]";
  const line = `${prefix} ${msg}`;
  
  if (type === "error") console.error(line);
  else if (type === "warn") console.warn(line);
  else console.log(line);
  
  reportLines.push(line);
}

// Fungsi pembanding yang aman (mengubah ke string agar 682 === "682")
function safeCompare(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

// Fungsi fetch data berdasarkan array ID (dipecah per 100 untuk menghindari limit URL)
async function fetchByIds(table, ids) {
  if (ids.length === 0) return [];
  let results = [];
  const chunkSize = 100;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await supabase.from(table).select("*").in("id", chunk);
    if (error) throw new Error(`Fetch error ${table}: ${error.message}`);
    results.push(...data);
  }
  return results;
}

// ========================================
// 3. FUNGSI UTAMA PENGECEKAN
// ========================================
async function checkMyWork() {
  try {
    log("info", "========================================");
    log("info", "   CEK INTEGRITAS DATA PO & SPB (DETAIL)");
    log("info", "========================================\n");

    // 1. Baca file lokal
    if (!fs.existsSync(FILE_PO) || !fs.existsSync(FILE_SPB)) {
      throw new Error("File add_po.json atau add_spb.json tidak ditemukan.");
    }

    const localPo = JSON.parse(fs.readFileSync(FILE_PO, "utf8"));
    const localSpb = JSON.parse(fs.readFileSync(FILE_SPB, "utf8"));

    log("info", `File add_po.json  : ${localPo.length} baris`);
    log("info", `File add_spb.json : ${localSpb.length} baris\n`);

    // 2. Kumpulkan ID dari file
    const poIdsToFetch = new Set(localPo.map((p) => Number(p.id)));
    const spbIdsToFetch = new Set(localSpb.map((s) => Number(s.id)));

    // 3. Tarik data awal dari database
    log("info", "Menarik data dari database...");
    let dbPos = await fetchByIds("po", Array.from(poIdsToFetch));
    let dbSpbs = await fetchByIds("spb", Array.from(spbIdsToFetch));

    // 4. Kumpulkan relasi silang (agar tidak false-positive)
    // Jika PO menunjuk SPB, pastikan kita juga menarik SPB tersebut.
    // Jika SPB menunjuk PO, pastikan kita juga menarik PO tersebut.
    dbPos.forEach((p) => { if (p.id_spb) spbIdsToFetch.add(Number(p.id_spb)); });
    dbSpbs.forEach((s) => { if (s.id_po) poIdsToFetch.add(Number(s.id_po)); });

    // Tarik ulang data lengkap dengan relasi yang sudah dikumpulkan
    dbPos = await fetchByIds("po", Array.from(poIdsToFetch));
    dbSpbs = await fetchByIds("spb", Array.from(spbIdsToFetch));

    // Buat Map untuk pencarian cepat (O(1))
    const dbPoMap = new Map(dbPos.map((p) => [Number(p.id), p]));
    const dbSpbMap = new Map(dbSpbs.map((s) => [Number(s.id), s]));

    log("info", `Terkumpul ${dbPos.length} PO dan ${dbSpbs.length} SPB dari DB (termasuk relasi).\n`);

    let errCount = 0;
    let warnCount = 0;

    // ====================================
    // CEK A: PO FILE LOKAL vs DATABASE
    // ====================================
    log("info", "--- [A] CEK PO FILE LOKAL VS DATABASE ---");
    for (const fileRow of localPo) {
      const dbRow = dbPoMap.get(Number(fileRow.id));
      if (!dbRow) {
        log("error", `PO ID ${fileRow.id} (${fileRow.nama_barang_po}) ada di file, tapi TIDAK ADA di database.`);
        errCount++;
        continue;
      }

      // Cek id_spb (menggunakan safeCompare)
      if (!safeCompare(fileRow.id_spb, dbRow.id_spb)) {
        log("error", `Mismatch PO ID ${fileRow.id}: id_spb di file = ${fileRow.id_spb}, di DB = ${dbRow.id_spb}`);
        errCount++;
      }
    }
    log("info", ">> Cek PO Lokal selesai.\n");

    // ====================================
    // CEK B: SPB FILE LOKAL vs DATABASE
    // ====================================
    log("info", "--- [B] CEK SPB FILE LOKAL VS DATABASE ---");
    for (const fileRow of localSpb) {
      const dbRow = dbSpbMap.get(Number(fileRow.id));
      if (!dbRow) {
        log("error", `SPB ID ${fileRow.id} (${fileRow.nama_barang_spb}) ada di file, tapi TIDAK ADA di database.`);
        errCount++;
        continue;
      }

      // Cek id_po
      if (!safeCompare(fileRow.id_po, dbRow.id_po)) {
        log("error", `Mismatch SPB ID ${fileRow.id}: id_po di file = ${fileRow.id_po}, di DB = ${dbRow.id_po}`);
        errCount++;
      }

      // Cek qty_permintaan
      if (!safeCompare(fileRow.qty_permintaan, dbRow.qty_permintaan)) {
        log("error", `Mismatch SPB ID ${fileRow.id}: qty di file = ${fileRow.qty_permintaan}, di DB = ${dbRow.qty_permintaan}`);
        errCount++;
      }

      // Cek satuan
      if (!safeCompare(fileRow.satuan, dbRow.satuan)) {
        log("error", `Mismatch SPB ID ${fileRow.id}: satuan di file = "${fileRow.satuan}", di DB = "${dbRow.satuan}"`);
        errCount++;
      }

      // Peringatan Data Kosong
      if (dbRow.qty_permintaan == null || dbRow.qty_permintaan <= 0) {
        log("warn", `SPB ID ${fileRow.id} (${dbRow.nama_barang_spb}): qty di DB tidak valid (${dbRow.qty_permintaan}).`);
        warnCount++;
      }
      if (!dbRow.satuan) {
        log("warn", `SPB ID ${fileRow.id} (${dbRow.nama_barang_spb}): satuan kosong di database.`);
        warnCount++;
      }
    }
    log("info", ">> Cek SPB Lokal selesai.\n");

    // ====================================
    // CEK C: INTEGRITAS RELASI SILANG (BALIK)
    // ====================================
    log("info", "--- [C] CEK RELASI SILANG (PO <-> SPB) ---");
    // Memeriksa seluruh PO yang terlibat (baik dari file maupun relasi)
    for (const po of dbPos) {
      if (po.id_spb != null) {
        const spb = dbSpbMap.get(Number(po.id_spb));
        if (!spb) {
          log("error", `Relasi Putus: PO ID ${po.id} menunjuk ke SPB ID ${po.id_spb}, tapi SPB tersebut tidak ada di DB.`);
          errCount++;
        } else if (!safeCompare(spb.id_po, po.id)) {
          log("error", `Mismatch Relasi: PO ID ${po.id} menunjuk SPB ID ${po.id_spb}, tetapi SPB tersebut menunjuk ke PO ID ${spb.id_po} (seharusnya PO ID ${po.id}).`);
          errCount++;
        }
      }
    }
    log("info", ">> Cek Relasi selesai.\n");

    // ====================================
    // RINGKASAN
    // ====================================
    log("info", "========================================");
    log("info", "           RINGKASAN AKHIR");
    log("info", "========================================");
    
    if (errCount === 0 && warnCount === 0) {
      log("info", "✅ SANGAT SEMPURNA! Tidak ada error atau warning. Data sudah 100% lengkap dan sinkron.");
    } else {
      log("info", `Total Error   : ${errCount}`);
      log("info", `Total Warning : ${warnCount}`);
      if (errCount > 0) {
        log("error", "Terdapat ERROR. Cek log di atas atau buka file log untuk perbaikan.");
      }
    }

    // Simpan log ke file
    fs.writeFileSync(FILE_REPORT, reportLines.join("\n"), "utf8");
    log("info", `\n📄 Log detail lengkap telah disimpan di: ${FILE_REPORT}`);

  } catch (err) {
    console.error("\n[SYSTEM ERROR]", err.message);
    process.exitCode = 1;
  }
}

checkMyWork();