
const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname);
const OUTPUT_FILE = path.join(ROOT_DIR, "admin-stok-dump.txt");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
]);

const chunks = [];

function isEnvFile(filename) {
  return filename === ".env" || filename.startsWith(".env.");
}

function isBinary(buffer) {
  // Deteksi byte NUL yang umum pada file biner
  return buffer.includes(0);
}

function walkDirectory(dir) {
  const entries = fs.readdirSync(dir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;

      walkDirectory(fullPath);
      continue;
    }

    if (!entry.isFile()) continue;

    // Jangan salin file environment atau file output
    if (isEnvFile(entry.name)) continue;
    if (fullPath === OUTPUT_FILE) continue;

    const relativePath = path.relative(ROOT_DIR, fullPath);
    const buffer = fs.readFileSync(fullPath);

    // Lewati file biner, misalnya gambar dan font
    if (isBinary(buffer)) {
      console.log(`SKIP binary: ${relativePath}`);
      continue;
    }

    const content = buffer.toString("utf8");

    chunks.push([
      "=".repeat(80),
      `FILE: ${relativePath}`,
      "=".repeat(80),
      content,
      "",
      "",
    ].join("\n"));

    console.log(`Copied: ${relativePath}`);
  }
}

try {
  walkDirectory(ROOT_DIR);

  fs.writeFileSync(
    OUTPUT_FILE,
    chunks.join("\n"),
    "utf8"
  );

  console.log(`\nSelesai! ${chunks.length} file disalin.`);
  console.log(`Output: ${OUTPUT_FILE}`);
} catch (error) {
  console.error("Gagal menyalin file:", error.message);
  process.exitCode = 1;
}
