// File: cjs/upload_po.cjs

const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

// ========================================
// 1. KONFIGURASI ENV
// ========================================
const ROOT_DIR = path.join(__dirname, "..");

dotenv.config({
    path: path.join(ROOT_DIR, ".env"),
});

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
const TABLE_NAME = "po";

const JSON_FILE = path.join(__dirname, "add_po.json");

const ERROR_FILE = path.join(
    __dirname,
    "upload_po_errors.json"
);

const CHUNK_SIZE = 100;

// ========================================
// 3. KOLOM TABEL PO
// ========================================
// no_spb DIHAPUS karena tidak ditemukan
// pada skema tabel po di Supabase.
//
// Jika ternyata kolom no_spb memang dibutuhkan,
// periksa struktur tabel terlebih dahulu.
const ALLOWED_COLUMNS = [
    "id",
    "tanggal_po",
    "nama_barang_po",
    "nama_supplier",
    "id_spb",
    "material_datang_tgl",
    "material_datang_qty",
    "material_datang_satuan",
    "id_surat_jalan",
    "keterangan",
    "created_at",
];

// ========================================
// 4. VALIDASI KONFIGURASI
// ========================================
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error(
        "[FATAL ERROR] Supabase URL atau Key tidak ditemukan."
    );

    process.exit(1);
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ========================================
// 5. UPLOAD SATU BARIS
// ========================================
async function uploadSingleRow(row, rowNumber) {
    const { error } = await supabase
        .from(TABLE_NAME)
        .upsert(row, {
            onConflict: "id",
        });

    if (error) {
        return {
            rowNumber,
            id: row.id,
            success: false,
            code: error.code || null,
            message: error.message,
            details: error.details || null,
            hint: error.hint || null,
        };
    }

    return {
        rowNumber,
        id: row.id,
        success: true,
    };
}

// ========================================
// 6. FUNGSI UTAMA
// ========================================
async function uploadPo() {
    try {
        console.log("========================================");
        console.log("        UPLOAD DATA PO KE SUPABASE");
        console.log("========================================");
        console.log(`Tabel: ${TABLE_NAME}`);
        console.log(`File : ${JSON_FILE}`);
        console.log("========================================\n");

        // Periksa file JSON.
        if (!fs.existsSync(JSON_FILE)) {
            throw new Error(
                `File tidak ditemukan: ${JSON_FILE}`
            );
        }

        // Baca JSON.
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

        // Validasi dan bersihkan data.
        const cleanedData = [];
        const invalidRows = [];

        data.forEach((row, index) => {
            const rowNumber = index + 1;

            if (
                row === null ||
                typeof row !== "object" ||
                Array.isArray(row)
            ) {
                invalidRows.push(rowNumber);
                return;
            }

            if (
                row.id === undefined ||
                row.id === null
            ) {
                invalidRows.push(rowNumber);
                return;
            }

            const cleanedRow = {};

            for (const column of ALLOWED_COLUMNS) {
                if (
                    Object.prototype.hasOwnProperty.call(
                        row,
                        column
                    )
                ) {
                    cleanedRow[column] = row[column];
                }
            }

            cleanedData.push({
                rowNumber,
                row: cleanedRow,
            });
        });

        if (invalidRows.length > 0) {
            throw new Error(
                `Baris JSON tidak valid: ${invalidRows.join(", ")}`
            );
        }

        // Periksa duplikasi ID.
        const ids = cleanedData.map(
            ({ row }) => String(row.id)
        );

        if (new Set(ids).size !== ids.length) {
            throw new Error(
                "Ditemukan ID duplikat di add_po.json."
            );
        }

        console.log(`Total data: ${cleanedData.length}`);
        console.log(`Ukuran batch: ${CHUNK_SIZE}`);
        console.log("\nMemulai upload...\n");

        let successCount = 0;
        let failedCount = 0;

        const failedRows = [];

        // ====================================
        // 7. UPLOAD PER BATCH
        // ====================================
        for (
            let i = 0;
            i < cleanedData.length;
            i += CHUNK_SIZE
        ) {
            const chunk = cleanedData.slice(
                i,
                i + CHUNK_SIZE
            );

            const payload = chunk.map(
                ({ row }) => row
            );

            const startRow = chunk[0].rowNumber;
            const endRow =
                chunk[chunk.length - 1].rowNumber;

            console.log(
                `[UPLOAD] Baris ${startRow}-${endRow}...`
            );

            const { error } = await supabase
                .from(TABLE_NAME)
                .upsert(payload, {
                    onConflict: "id",
                });

            if (!error) {
                successCount += chunk.length;

                console.log(
                    `[SUCCESS] ${chunk.length} baris berhasil diproses.\n`
                );

                continue;
            }

            console.error(
                `[BATCH ERROR] ${error.message}`
            );

            console.error(
                `Kode: ${error.code || "-"}`
            );

            console.error(
                `Detail: ${error.details || "-"}`
            );

            console.error(
                `Petunjuk: ${error.hint || "-"}`
            );

            console.log(
                "\nMemeriksa setiap baris secara terpisah...\n"
            );

            // Identifikasi baris yang gagal.
            for (const item of chunk) {
                const result = await uploadSingleRow(
                    item.row,
                    item.rowNumber
                );

                if (result.success) {
                    successCount++;

                    console.log(
                        `[SUCCESS] Baris ${result.rowNumber}, ID ${result.id}`
                    );
                } else {
                    failedCount++;
                    failedRows.push(result);

                    console.error(
                        `[FAILED] Baris ${result.rowNumber}, ID ${result.id}`
                    );

                    console.error(
                        `  Kode : ${result.code || "-"}`
                    );

                    console.error(
                        `  Pesan: ${result.message}`
                    );

                    if (result.details) {
                        console.error(
                            `  Detail: ${result.details}`
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
        // 8. SIMPAN LAPORAN ERROR
        // ====================================
        if (failedRows.length > 0) {
            fs.writeFileSync(
                ERROR_FILE,
                JSON.stringify(
                    failedRows,
                    null,
                    2
                ),
                "utf8"
            );
        } else if (fs.existsSync(ERROR_FILE)) {
            fs.unlinkSync(ERROR_FILE);
        }

        // ====================================
        // 9. RINGKASAN
        // ====================================
        console.log("\n========================================");
        console.log("             HASIL UPLOAD PO");
        console.log("========================================");

        console.log(`Total data: ${cleanedData.length}`);
        console.log(`Berhasil  : ${successCount}`);
        console.log(`Gagal     : ${failedCount}`);

        console.log("========================================");

        if (failedCount > 0) {
            console.error(
                `\nLaporan error: ${ERROR_FILE}`
            );

            process.exitCode = 1;
        } else {
            console.log(
                "\n[SUCCESS] Semua data berhasil diproses."
            );
        }
    } catch (error) {
        console.error(
            "\n[SYSTEM ERROR]",
            error.message
        );

        process.exitCode = 1;
    }
}

// ========================================
// 10. JALANKAN SCRIPT
// ========================================
uploadPo();
