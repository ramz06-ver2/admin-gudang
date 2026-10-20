const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Nama file disesuaikan persis dengan yang ada di komputer Anda
const excelFilePath = path.join(__dirname, 'Monitoring SPB Atiara Ubud Bali Update 13102026.xlsx');
const jsonOutputPath = path.join(__dirname, 'output_data.json');

try {
    const workbook = xlsx.readFile(excelFilePath, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // defval: null memastikan array tidak bergeser meskipun ada cell yang kosong di Excel
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    const extractedData = [];
    let idCounter = 1;
    
    // Mulai dari baris ke-5 (index 4) tempat data pertama kali muncul
    for (let i = 4; i < rawData.length; i++) {
        const row = rawData[i];
        
        // Skip baris jika kolom SPB (1) dan Nama Barang (4) kosong
        if (!row || (row[1] === null && row[4] === null)) continue;
        
        const cleanStr = (val) => val ? String(val).trim() : null;
        const parseDate = (val) => {
            if (!val) return null;
            if (val instanceof Date) {
                const tzOffset = val.getTimezoneOffset() * 60000;
                return (new Date(val.getTime() - tzOffset)).toISOString().slice(0, 10);
            }
            return cleanStr(val);
        };

        // Pemetaan 100% mengikuti isi Excel tanpa ada kolom karangan
        const rowData = {
            id: idCounter++,
            spb_no: cleanStr(row[1]),                     // [1] SPB NO
            spb_tgl: parseDate(row[2]),                   // [2] SPB TGL
            no_urut: cleanStr(row[3]),                    // [3] NO
            nama_barang: cleanStr(row[4]),                // [4] NAMA BARANG
            ukuran: cleanStr(row[5]),                     // [5] UKURAN
            permintaan_qty: row[6] ?? 0,                  // [6] PERMINTAAN QTY
            permintaan_unit: cleanStr(row[7]),            // [7] PERMINTAAN UNIT
            po_no: cleanStr(row[8]),                      // [8] PO NO
            po_tgl: parseDate(row[9]),                    // [9] PO TGL
            supplier: cleanStr(row[10]),                  // [10] SUPPLIER
            status: cleanStr(row[11]),                    // [11] STATUS
            merk: cleanStr(row[12]),                      // [12] MERK
            spesifikasi_teknis: cleanStr(row[13]),        // [13] SPESIFIKASI TEKNIS
            lokasi_pemasangan: cleanStr(row[14]),         // [14] LOKASI PEMASANGAN
            rencana_pemasangan: cleanStr(row[15]),        // [15] RENCANA PEMASANGAN
            material_datang_tgl: parseDate(row[17]),      // [17] MATERIAL DATANG TGL
            material_datang_qty: row[18] ?? 0,            // [18] MATERIAL DATANG QTY
            material_datang_unit: cleanStr(row[19]),      // [19] MATERIAL DATANG UNIT
            lama_proses_hari: row[20] ?? null,            // [20] LAMA PROSES (HARI)
            kurang_lebih: row[21] ?? null,                // [21] KURANG LEBIH
            keterangan: cleanStr(row[22])                 // [22] KETERANGAN
        };
        
        extractedData.push(rowData);
    }
    
    fs.writeFileSync(jsonOutputPath, JSON.stringify(extractedData, null, 2), 'utf-8');
    console.log(`Berhasil! ${extractedData.length} baris data diproses murni sesuai tabel Excel Anda.`);
    
} catch (error) {
    console.error('Error saat konversi:', error.message);
}