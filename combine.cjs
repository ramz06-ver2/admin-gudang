// combine.js
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const OUTPUT_FILE = path.join(__dirname, 'combined.txt');

// Daftar extension yang mau di-include (kosongkan array = semua file)
const INCLUDE_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.json', '.css', '.html', '.md'];
// File/folder yang di-skip
const IGNORE_LIST = ['node_modules', '.git', 'dist', 'build', '.next'];

/**
 * Cek apakah file/folder harus di-skip
 */
function shouldIgnore(name) {
  return IGNORE_LIST.includes(name);
}

/**
 * Baca semua file secara rekursif
 */
function walkDir(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (shouldIgnore(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkDir(fullPath, files);
    } else if (entry.isFile()) {
      // Filter extension jika INCLUDE_EXTENSIONS tidak kosong
      if (INCLUDE_EXTENSIONS.length > 0) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!INCLUDE_EXTENSIONS.includes(ext)) continue;
      }
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Format output: gabungkan semua file
 */
function buildOutput(files) {
  const parts = [];
  const timestamp = new Date().toISOString();

  parts.push('='.repeat(80));
  parts.push(`COMBINED SOURCE FILES`);
  parts.push(`Generated: ${timestamp}`);
  parts.push(`Total files: ${files.length}`);
  parts.push('='.repeat(80));
  parts.push('');

  for (const file of files) {
    // Path relatif terhadap folder src (untuk header)
    const relativePath = path.relative(__dirname, file).replace(/\\/g, '/');
    // Nama file
    const fileName = path.basename(file);
    // Folder lokasi
    const folderPath = path.dirname(relativePath);

    parts.push('');
    parts.push('='.repeat(80));
    parts.push(`FILE   : ${fileName}`);
    parts.push(`PATH   : ${relativePath}`);
    parts.push(`FOLDER : ${folderPath}`);
    parts.push('='.repeat(80));

    try {
      const content = fs.readFileSync(file, 'utf-8');
      parts.push(content);
    } catch (err) {
      parts.push(`[ERROR membaca file: ${err.message}]`);
    }

    parts.push(''); // newline pemisah
  }

  return parts.join('\n');
}

/**
 * Main
 */
function main() {
  // Cek folder src
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`❌ Folder tidak ditemukan: ${SRC_DIR}`);
    process.exit(1);
  }

  console.log(`📂 Membaca file dari: ${SRC_DIR}`);

  const files = walkDir(SRC_DIR);
  console.log(`✅ Ditemukan ${files.length} file`);

  if (files.length === 0) {
    console.warn('⚠️  Tidak ada file yang ditemukan.');
    return;
  }

  const output = buildOutput(files);
  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');

  const sizeKB = (Buffer.byteLength(output, 'utf-8') / 1024).toFixed(2);
  console.log(`💾 Output disimpan ke: ${OUTPUT_FILE}`);
  console.log(`📦 Ukuran file: ${sizeKB} KB`);
}

main();