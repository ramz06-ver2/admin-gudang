const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelFilePath = path.join(__dirname, 'Monitoring SPB Atiara Ubud Bali Update 13102026.xlsx');
const jsonOutputPath = path.join(__dirname, 'output_data.json');

try {
    const workbook = xlsx.readFile(excelFilePath, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const extractedData = [];
    
    let idCounter = 1;
    let currentSpbNo = null; // <- Ini kuncinya! Mengingat No SPB terakhir
    
    for (let i = 4; i < rawData.length; i++) {
        const row = rawData[i];
        
        // Bersihkan data
        const cleanStr = (val) => val ? String(val).trim() : null;
        const spbRaw = cleanStr(row[1]);
        const namaBarang = cleanStr(row[4]);
        
        // Jika ada nomor SPB di baris ini, update ingatannya
        if (spbRaw) {
            currentSpbNo = spbRaw;
        }
        
        // Kalau benar-benar baris kosong, lewati
        if (!spbRaw && !namaBarang) continue;
        
        const parseDate = (val) => {
            if (!val) return null;
            if (val instanceof Date) {
                const tzOffset = val.getTimezoneOffset() * 60000;
                return (new Date(val.getTime() - tzOffset)).toISOString().slice(0, 10);
            }
            return cleanStr(val);
        };

        const rowData = {
            id: idCounter++,
            spb_no: currentSpbNo,                         // Gunakan No SPB yang diingat
            spb_tgl: parseDate(row[2]),                   
            no_urut: cleanStr(row[3]),                    
            nama_barang: namaBarang,                
            ukuran: cleanStr(row[5]),                     
            permintaan_qty: row[6] ?? 0,                  
            permintaan_unit: cleanStr(row[7]),            
            po_no: cleanStr(row[8]),                      
            po_tgl: parseDate(row[9]),                    
            supplier: cleanStr(row[10]),                  
            status: cleanStr(row[11]),                    
            merk: cleanStr(row[12]),                      
            spesifikasi_teknis: cleanStr(row[13]),        
            lokasi_pemasangan: cleanStr(row[14]),         
            rencana_pemasangan: cleanStr(row[15]),        
            material_datang_tgl: parseDate(row[17]),      
            material_datang_qty: row[18] ?? 0,            
            material_datang_unit: cleanStr(row[19]),      
            lama_proses_hari: row[20] ?? null,            
            kurang_lebih: row[21] ?? null,                
            keterangan: cleanStr(row[22])                 
        };
        
        extractedData.push(rowData);
    }
    
    fs.writeFileSync(jsonOutputPath, JSON.stringify(extractedData, null, 2), 'utf-8');
    console.log(`Berhasil! ${extractedData.length} baris data berhasil dibuat dengan grup SPB yang utuh.`);
    
} catch (error) {
    console.error('Error saat konversi:', error.message);
}