const fs = require("node:fs");
const path = require("node:path");

const rootDir = __dirname;
const srcDir = path.join(rootDir, "../src");
const outputFile = path.join(rootDir, "gabungan-src.txt");

const ignoredDirs = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
]);

// Ekstensi file teks/kode yang akan digabungkan.
const allowedExtensions = new Set([
  ".js", ".jsx", ".ts", ".tsx",
  ".json", ".css", ".scss", ".sass",
  ".html", ".htm", ".svg",
  ".md", ".mdx", ".txt",
  ".yml", ".yaml", ".xml",
  ".sql", ".sh", ".cjs", ".mjs",
  ".env", ".prisma", ".graphql",
]);

function collectFiles(dir) {
  const results = [];

  const entries = fs.readdirSync(dir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      results.push(...collectFiles(fullPath));
      continue;
    }

    if (
      entry.isFile() &&
      allowedExtensions.has(path.extname(entry.name).toLowerCase())
    ) {
      results.push(fullPath);
    }
  }

  return results;
}

function main() {
  if (!fs.existsSync(srcDir)) {
    console.error(`Folder src tidak ditemukan: ${srcDir}`);
    process.exitCode = 1;
    return;
  }

  const files = collectFiles(srcDir).sort((a, b) =>
    path.relative(rootDir, a).localeCompare(
      path.relative(rootDir, b)
    )
  );

  const sections = files.map((file) => {
    const relativePath = path.relative(rootDir, file);
    const content = fs.readFileSync(file, "utf8");

    return [
      "=".repeat(80),
      `FILE: ${relativePath}`,
      `PATH: ${file}`,
      "=".repeat(80),
      "",
      content,
      "",
      "",
    ].join("\n");
  });

  fs.writeFileSync(
    outputFile,
    sections.join(""),
    "utf8"
  );

  console.log(`Berhasil menggabungkan ${files.length} file.`);
  console.log(`Hasil: ${outputFile}`);
}

main();