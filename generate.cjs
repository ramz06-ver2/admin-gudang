const fs = require('fs');

// 1. Baca data Master Produk
const products = JSON.parse(fs.readFileSync('products.json', 'utf-8'));

// Fungsi untuk konversi format tanggal Indonesia ke YYYY-MM-DD
function parseDate(indoDateStr) {
    if (!indoDateStr) return null;
    const months = {
        "Januari": "01", "Februari": "02", "Maret": "03", "April": "04",
        "Mei": "05", "Juni": "06", "Juli": "07", "Agustus": "08",
        "September": "09", "Oktober": "10", "November": "11", "Desember": "12"
    };
    for (const [name, num] of Object.entries(months)) {
        if (indoDateStr.includes(name)) {
            const parts = indoDateStr.replace(name, num).split(' ');
            if (parts.length >= 3) {
                return `${parts[2]}-${parts[1]}-${parts[0].padStart(2, '0')}`;
            }
        }
    }
    return indoDateStr;
}

// Fungsi untuk mencari kecocokan barang di surat jalan dengan database produk
function findProduct(nama, ukuran) {
    if (!nama) return null;
    const nameLower = nama.toLowerCase().trim();
    const sizeLower = ukuran && ukuran !== '-' ? ukuran.toLowerCase().trim() : '';

    // Cari berdasarkan nama
    const candidates = products.filter(p => 
        p.nama.toLowerCase().trim() === nameLower || 
        nameLower.includes(p.nama.toLowerCase().trim())
    );

    if (candidates.length > 0) {
        // Jika ada ukuran, coba cocokkan ukurannya
        if (sizeLower) {
            const sizeMatch = candidates.find(c => 
                (c.ukuran || '').toLowerCase().includes(sizeLower) || 
                sizeLower.includes((c.ukuran || '').toLowerCase())
            );
            if (sizeMatch) return sizeMatch;
        }
        return candidates[0]; // Kembalikan kecocokan pertama jika ukuran tidak ada/tidak cocok
    }
    return null;
}

// Fungsi utama untuk memproses file text surat jalan (format TSV / Tab-Separated)
function processSuratJalan(filename) {
    const content = fs.readFileSync(filename, 'utf-8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);

    // Cari baris header untuk dilewati
    let headerIdx = lines.findIndex(l => l.startsWith('No.') || l.includes('No.PO'));
    if (headerIdx === -1) return [];

    const records = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
        const parts = lines[i].split('\t'); // Pisahkan berdasarkan TAB
        
        if (parts.length >= 8) { 
            const nama_barang = parts[2]?.trim();
            const merk = parts[3]?.trim();
            const ukuran = parts[4]?.trim();
            const spesifikasi = parts[5]?.trim();
            const jml = parseInt(parts[6]?.trim() || '0', 10);
            const satuan = parts[7]?.trim();
            const tgl_kirim = parts[8]?.trim();

            const prod = findProduct(nama_barang, ukuran);

            records.push({
                kode_barang: prod ? prod.kode : null,
                nama_barang: prod ? prod.nama : nama_barang,
                ukuran_barang: prod ? prod.ukuran : (ukuran !== '-' ? ukuran : null),
                spesifikasi_barang: spesifikasi !== '-' ? spesifikasi : null,
                satuan_barang: prod ? prod.satuan : satuan,
                kategori: prod ? prod.kategori : "Material",
                jumlah_barang_masuk: jml,
                tanggal_pengiriman: parseDate(tgl_kirim),
                keterangan: (merk && merk !== '-') ? `Merk: ${merk}` : null
            });
        }
    }
    return records;
}

// ==========================================
// EKSEKUSI
// ==========================================
try {
    console.log("⏳ Membaca file surat jalan...");
    const sj1 = processSuratJalan('suratjalan05092026.txt');
    const sj2 = processSuratJalan('suratjalan28072026.txt');

    const gabungan = [...sj1, ...sj2];
    
    // Tambahkan ID
    const finalData = gabungan.map((item, idx) => ({ id: idx + 1, ...item }));

    // Simpan ke file
    fs.writeFileSync('gabungan_masuk.json', JSON.stringify(finalData, null, 2));
    
    console.log(`✅ BERHASIL! File 'gabungan_masuk.json' telah dibuat dengan total ${finalData.length} data.`);
} catch (error) {
    console.error("❌ Terjadi kesalahan:", error.message);
    console.log("Pastikan file products.json, suratjalan05092026.txt, dan suratjalan28072026.txt ada di folder yang sama.");
}