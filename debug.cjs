const XLSX = require("xlsx");

// 1. Cek file ada
const fs = require("fs");
const files = fs.readdirSync(".").filter((f) => f.endsWith(".xlsx"));
console.log("📁 File .xlsx di folder ini:", files);

if (files.length === 0) {
  console.error("❌ Tidak ada file .xlsx di folder ini!");
  process.exit(1);
}

const filename = files[0];
console.log(`\n📖 Baca file: ${filename}\n`);

// 2. Baca workbook
const wb = XLSX.readFile(filename);
console.log("📄 Sheet names:", wb.SheetNames);
console.log("");

// 3. Ambil sheet pertama
const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
console.log(`📄 Menggunakan sheet: ${sheetName}\n`);

// 4. Baca 10 baris pertama sebagai array 2D
const rows = XLSX.utils.sheet_to_json(ws, {
  header: 1,
  defval: "",
  blankrows: true,
});

console.log(`📊 Total baris: ${rows.length}\n`);
console.log("📋 10 baris pertama:");
console.log("─".repeat(100));

for (let i = 0; i < Math.min(10, rows.length); i++) {
  const row = rows[i];
  console.log(`Row ${i}:`, JSON.stringify(row));
}

console.log("─".repeat(100));
