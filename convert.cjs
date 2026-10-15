const XLSX = require("xlsx");
const fs = require("fs");

// ============================================
// ⚙️ KONFIGURASI
// ============================================
const FILENAME = "databarang.xlsx";

// Kata-kata yang dianggap "kata umum" → ambil 2 kata
// Kata lain → ambil 1 kata saja
// Silakan tambah/edit sesuai kebutuhan
const GENERIC_WORDS = new Set([
  "mata",
  "kabel",
  "besi",
  "mur",
  "pipa",
  "ball",
  "gate",
  "water",
  "double",
  "bushing",
  "copper",
  "reducer",
  "reduser",
  "tee",
  "cat",
  "sepatu",
  "kunci",
  "tang",
  "obeng",
  "kuas",
  "roll",
  "face",
  "shock",
  "selang",
  "tabung",
  "mesin",
  "sand",
  "chemical",
  "main",
  "gutter",
  "inlet",
  "vacuum",
  "swim",
  "circ",
  "heat",
  "swimming",
  "kawat",
  "isolasi",
  "insulation",
  "lampu",
  "trafo",
  "saklar",
  "steker",
  "helm",
  "apar",
  "gembok",
  "rantai",
  "kedok",
  "kaca",
  "kain",
  "skrup",
  "sekrup",
  "fisher",
  "lasdop",
  "sealtape",
  "resin",
  "hardener",
  "benang",
  "flaring",
  "cutter",
  "charging",
  "pentil",
  "klem",
  "dyna",
  "pressure",
  "cramping",
  "webbing",
  "tambang",
  "tackel",
  "meteran",
  "analizer",
  "pvc",
  "sok",
  "stop",
]);

// ============================================
// 1. Cek file
// ============================================
if (!fs.existsSync(FILENAME)) {
  console.error(`❌ File "${FILENAME}" tidak ditemukan`);
  process.exit(1);
}

// ============================================
// 2. Baca Excel
// ============================================
const wb = XLSX.readFile(FILENAME);
const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];

const allRows = XLSX.utils.sheet_to_json(ws, {
  header: 1,
  defval: "",
  blankrows: false,
});

console.log(`📖 Baca file: ${FILENAME}`);
console.log(`📄 Sheet: ${sheetName}`);
console.log(`📊 Total baris: ${allRows.length}\n`);

// ============================================
// 3. Auto-detect header
// ============================================
let headerRowIndex = -1;
const cols = {
  no: -1,
  nama: -1,
  ukuran: -1,
  stock: -1,
  satuan: -1,
  kategori: -1,
};

for (let i = 0; i < Math.min(20, allRows.length); i++) {
  const row = allRows[i];
  const rowLower = row.map((c) => String(c).toLowerCase().trim());
  const namaIdx = rowLower.findIndex((c) => c === "nama barang");

  if (namaIdx >= 0) {
    headerRowIndex = i;
    rowLower.forEach((cell, idx) => {
      if (cell === "no") cols.no = idx;
      if (cell === "nama barang") cols.nama = idx;
      if (cell === "ukuran") cols.ukuran = idx;
      if (cell === "stock awal" || cell === "stok awal") cols.stock = idx;
      if (cell === "satuan") cols.satuan = idx;
      if (cell === "kategori") cols.kategori = idx;
    });
    break;
  }
}

if (headerRowIndex < 0) {
  console.error("❌ Header 'Nama Barang' tidak ditemukan");
  process.exit(1);
}

console.log(`📌 Header di baris ke-${headerRowIndex + 1}\n`);

// ============================================
// 4. Fungsi ekstrak jenis
// ============================================
function extractType(nama) {
  // Bersihkan karakter khusus di depan
  let clean = nama.trim().replace(/^[-.\s]+/, "");

  // Split by spasi & dash
  const words = clean.split(/[\s\-]+/).filter(Boolean);

  if (words.length === 0) return "UNKNOWN";
  if (words.length === 1) return words[0].toUpperCase();

  // Kalau kata pertama 1 huruf (misal "U-bolt" → "U")
  // → ambil 2 kata
  if (words[0].length === 1) {
    return `${words[0]} ${words[1]}`.toUpperCase();
  }

  const firstLower = words[0].toLowerCase();

  // Kalau kata pertama generic → ambil 2 kata
  if (GENERIC_WORDS.has(firstLower)) {
    return `${words[0]} ${words[1]}`.toUpperCase();
  }

  // Default: 1 kata
  return words[0].toUpperCase();
}

// ============================================
// 5. Parse data
// ============================================
const products = [];

for (let i = headerRowIndex + 1; i < allRows.length; i++) {
  const row = allRows[i];
  const nama = String(row[cols.nama] || "").trim();
  const ukuran = cols.ukuran >= 0 ? String(row[cols.ukuran] || "").trim() : "";
  const satuan =
    cols.satuan >= 0 ? String(row[cols.satuan] || "pcs").trim() : "pcs";
  const kategori =
    cols.kategori >= 0 ? String(row[cols.kategori] || "").trim() : "";

  if (!nama || !kategori) continue;
  if (!["Material", "Alat Bantu"].includes(kategori)) continue;

  products.push({
    nama,
    ukuran: ukuran || null,
    satuan: satuan || "pcs",
    stok: 0,
    kategori,
  });
}

// ============================================
// 6. Generate kode per jenis
// ============================================
const typeCounters = {};

const productsWithCode = products.map((p) => {
  const type = extractType(p.nama);
  typeCounters[type] = (typeCounters[type] || 0) + 1;

  const kode = `${type.replace(/\s+/g, "-")}-${String(typeCounters[type]).padStart(3, "0")}`;

  return {
    kode,
    nama: p.nama,
    ukuran: p.ukuran,
    satuan: p.satuan,
    stok: p.stok,
    kategori: p.kategori,
  };
});

// ============================================
// 7. Report
// ============================================
console.log(`📊 Total produk: ${productsWithCode.length}`);
console.log(`📦 Total jenis   : ${Object.keys(typeCounters).length}\n`);

console.log("📋 Top 20 jenis terbanyak:");
console.log("─".repeat(60));
const sorted = Object.entries(typeCounters).sort((a, b) => b[1] - a[1]);
sorted.slice(0, 20).forEach(([type, count]) => {
  console.log(`   ${type.padEnd(30)} ${String(count).padStart(4)} item`);
});
if (sorted.length > 20) {
  console.log(`   ... dan ${sorted.length - 20} jenis lainnya\n`);
} else {
  console.log("");
}

console.log("📋 Sample 15 pertama:");
console.log("─".repeat(100));
productsWithCode.slice(0, 15).forEach((p, i) => {
  console.log(
    `${String(i + 1).padStart(3)}. ${p.kode.padEnd(25)} | ${p.nama.padEnd(32)} | ${String(p.ukuran ?? "-").padEnd(15)} | ${p.satuan}`,
  );
});

console.log("\n📋 Sample per jenis (5 jenis):");
console.log("─".repeat(100));
const sampleTypes = sorted.slice(0, 5).map(([t]) => t);
sampleTypes.forEach((type) => {
  const items = productsWithCode.filter((p) =>
    p.kode.startsWith(type.replace(/\s+/g, "-")),
  );
  console.log(`\n🔖 ${type}:`);
  items.slice(0, 3).forEach((p) => {
    console.log(
      `   ${p.kode.padEnd(25)} | ${p.nama.padEnd(32)} | ${p.ukuran ?? "-"}`,
    );
  });
  if (items.length > 3) {
    console.log(`   ... (${items.length} total)`);
  }
});

// ============================================
// 8. Simpan ke JSON
// ============================================
fs.writeFileSync("products.json", JSON.stringify(productsWithCode, null, 2));
console.log(
  `\n💾 Disimpan ke products.json (${productsWithCode.length} produk)`,
);
