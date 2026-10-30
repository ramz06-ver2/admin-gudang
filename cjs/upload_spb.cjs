
// File: cjs/upload_spb.cjs

const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

// ========================================
// 1. KONFIGURASI ENV
// ========================================
const ROOT_DIR = path.join(__dirname, "..");

// Muat .env dari folder utama proyek.
dotenv.config({
    path: path.join(ROOT_DIR, ".env"),
});

// Muat .env.local jika tersedia.
// Nilai yang sudah dimuat dari .env tidak ditimpa.
dotenv.config({
    path: path.join(ROOT_DIR, ".env.local"),
    override: false,
});

const SUPABASE_URL =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL;

const SUPABASE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_KEY ||
    process.env.SUPABASE_KEY;

// ========================================
// 2. KONFIGURASI UPLOAD
// ========================================
const TABLE_NAME = "spb";

const JSON_FILE = path.join(__dirname, "add_spb.json");

const CHUNK_SIZE = 100;

// ========================================
// 3. VALIDASI KONFIGURASI
// ========================================
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error(
        "[FATAL ERROR] Supabase URL atau Key tidak ditemukan."
    );
    console.error(
        "Periksa file .env atau .env.local di folder utama proyek."
    );
    process.exit(1);
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ========================================
// 4. FUNGSI UPLOAD SATU BARIS
// ========================================
async function uploadSingleRow(row, rowNumber) {
    const { error } = await supabase
        .from(TABLE_NAME)
        .upsert([row]);

    if (error) {
        return {
            success: false,
            rowNumber,
            id: row.id ?? null,
            code: error.code || null,
            message: error.message,
            details: error.details || null,
            hint: error.hint || null,
        };
    }

    return {
        success: true,
        rowNumber,
        id: row.id ?? null,
    };
}

// ========================================
// 5. FUNGSI UTAMA
// ========================================
async function uploadSpb() {
    try {
        console.log("========================================");
        console.log("        UPLOAD DATA SPB");
        console.log("========================================");
        console.log(`Supabase : ${SUPABASE_URL}`);
        console.log(`Tabel    : ${TABLE_NAME}`);
        console.log(`File     : ${JSON_FILE}`);
        console.log("========================================\n");

        // ------------------------------------
        // Periksa file JSON
        // ------------------------------------
        if (!fs.existsSync(JSON_FILE)) {
            throw new Error(
                `File tidak ditemukan: ${JSON_FILE}`
            );
        }

        console.log("Membaca file add_spb.json...");

        const rawData = fs.readFileSync(
            JSON_FILE,
            "utf8"
        );

        const data = JSON.parse(rawData);

        if (!Array.isArray(data)) {
            throw new Error(
                "Format JSON harus berupa array objek."
            );
        }

        if (data.length === 0) {
            console.log("Tidak ada data untuk di-upload.");
            return;
        }

        // ------------------------------------
        // Validasi setiap baris
        // ------------------------------------
        for (let i = 0; i < data.length; i++) {
            const row = data[i];

            if (
                row === null ||
                typeof row !== "object" ||
                Array.isArray(row)
            ) {
                throw new Error(
                    `Baris JSON ke-${i + 1} bukan objek yang valid.`
                );
            }
        }

        console.log(
            `Total data siap di-upload: ${data.length} baris.\n`
        );

        // ------------------------------------
        // Upload data per batch
        // ------------------------------------
        let successCount = 0;
        let failedCount = 0;
        const failedRows = [];

        for (
            let i = 0;
            i < data.length;
            i += CHUNK_SIZE
        ) {
            const chunk = data.slice(
                i,
                i + CHUNK_SIZE
            );

            const startRow = i + 1;
            const endRow = i + chunk.length;

            console.log(
                `[UPLOAD] Baris ${startRow}-${endRow}...`
            );

            const { error } = await supabase
                .from(TABLE_NAME)
                .upsert(chunk);

            // --------------------------------
            // Batch berhasil
            // --------------------------------
            if (!error) {
                successCount += chunk.length;

                console.log(
                    `[SUCCESS] Baris ${startRow}-${endRow} berhasil.\n`
                );

                continue;
            }

            // --------------------------------
            // Batch gagal: tampilkan error
            // dan coba setiap baris
            // --------------------------------
            console.error(
                `[BATCH ERROR] Baris ${startRow}-${endRow} gagal.`
            );
            console.error(`Kode    : ${error.code || "-"}`);
            console.error(`Pesan   : ${error.message}`);
            console.error(`Detail  : ${error.details || "-"}`);
            console.error(`Petunjuk: ${error.hint || "-"}\n`);

            console.log(
                `[RETRY] Memeriksa baris ${startRow}-${endRow} satu per satu...\n`
            );

            for (let j = 0; j < chunk.length; j++) {
                const row = chunk[j];
                const rowNumber = startRow + j;

                const result = await uploadSingleRow(
                    row,
                    rowNumber
                );

                if (result.success) {
                    successCount++;

                    console.log(
                        `[SUCCESS] Baris ${rowNumber}` +
                        ` | ID: ${result.id ?? "-"}`
                    );
                } else {
                    failedCount++;
                    failedRows.push(result);

                    console.error(
                        `[FAILED] Baris ${rowNumber}` +
                        ` | ID: ${result.id ?? "-"}`
                    );

                    console.error(
                        `  Kode   : ${result.code || "-"}`
                    );

                    console.error(
                        `  Pesan  : ${result.message}`
                    );

                    if (result.details) {
                        console.error(
                            `  Detail : ${result.details}`
                        );
                    }

                    if (result.hint) {
                        console.error(
                            `  Petunjuk: ${result.hint}`
                        );
                    }
                }
            }

            console.log("");
        }

        // ====================================
        // 6. RINGKASAN HASIL
        // ====================================
        console.log("\n========================================");
        console.log("           HASIL UPLOAD SPB");
        console.log("========================================");
        console.log(`Total data : ${data.length}`);
        console.log(`Berhasil   : ${successCount}`);
        console.log(`Gagal      : ${failedCount}`);
        console.log("========================================");

        // ------------------------------------
        // Simpan laporan baris yang gagal
        // ------------------------------------
        if (failedRows.length > 0) {
            const reportPath = path.join(
                __dirname,
                "upload_spb_errors.json"
            );

            fs.writeFileSync(
                reportPath,
                JSON.stringify(failedRows, null, 2),
                "utf8"
            );

            console.error(
                `\n[PERHATIAN] ${failedRows.length} baris gagal di-upload.`
            );

            console.error(
                `Laporan error: ${reportPath}`
            );

            console.error(
                "Periksa foreign key dan data referensi sebelum mencoba lagi."
            );

            process.exitCode = 1;
        } else {
            console.log(
                "\n[SUCCESS] Semua data berhasil di-upload."
            );
        }
    } catch (err) {
        console.error(
            "\n[SYSTEM ERROR]",
            err.message
        );

        process.exitCode = 1;
    }
}

// ========================================
// 7. JALANKAN SCRIPT
// ========================================
uploadSpb();
