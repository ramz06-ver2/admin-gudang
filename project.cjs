
const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname);
const OUTPUT_FILE = path.join(ROOT_DIR, "admin-stok-full.txt");

const EXCLUDED_DIRS = new Set([
  "node_modules",
]);

const EXCLUDED_FILES = new Set([
  ".env",
  ".env.local",
]);

const chunks = [];
let copied = 0;
let skipped = 0;

function walk(dir) {
  const entries = fs.readdirSync(dir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        console.log(`SKIP folder: ${fullPath}`);
        continue;
      }

      walk(fullPath);
      continue;
    }

    if (!entry.isFile()) continue;

    // Abaikan file environment yang ditentukan
    if (EXCLUDED_FILES.has(entry.name)) {
      console.log(`SKIP file: ${path.relative(ROOT_DIR, fullPath)}`);
      skipped++;
      continue;
    }

    // Jangan masukkan file output ke dalam dirinya sendiri
    if (fullPath === OUTPUT_FILE) continue;

    // Baca file sebagai buffer agar file biner bisa dikenali
    const buffer = fs.readFileSync(fullPath);

    if (buffer.includes(0)) {
      console.log(`SKIP binary: ${path.relative(ROOT_DIR, fullPath)}`);
      skipped++;
      continue;
    }

    const relativePath = path.relative(ROOT_DIR, fullPath);
    const content = buffer.toString("utf8");

    chunks.push(
      [
        "",
        "=".repeat(100),
        `FILE: ${relativePath}`,
        `ABSOLUTE PATH: ${fullPath}`,
        "=".repeat(100),
        content,
        "",
      ].join("\n")
    );

    copied++;
    console.log(`COPY: ${relativePath}`);
  }
}

try {
  walk(ROOT_DIR);

  fs.writeFileSync(
    OUTPUT_FILE,
    chunks.join("\n"),
    "utf8"
  );

  console.log("\n========================================");
  console.log("SELESAI");
  console.log(`File disalin : ${copied}`);
  console.log(`File dilewati: ${skipped}`);
  console.log(`Hasil        : ${OUTPUT_FILE}`);
  console.log("========================================");
} catch (error) {
  console.error("Gagal:", error.message);
  process.exitCode = 1;
}
