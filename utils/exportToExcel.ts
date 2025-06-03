import ExcelJS from "exceljs";
import { supabase } from "@/utils/supabaseClient";

// Definisikan tipe data untuk monitoring dan detail produksi
interface DetailProduksi {
  nama_ikan: string;
  jumlah_kg: number;
  harga_per_kg: number;
}

interface MonitoringData {
  nama_anggota: string;
  kub: string;
  trip: number;
  jenis_bbm: string;
  jumlah_bbm_liter: number;
  daerah_penangkapan: string;
  keterangan: string;
  detail_produksi: DetailProduksi[];
  domisili: string;
  bulan: string;
  tahun: string;
}

const exportToExcel = async (domisili: string = '', kub: string = '', bulan: string = '', tahun: string = '') => {
    // Fetch data dari Supabase dengan detail produksi
    let query = supabase
    .from("monitoring")
    .select(`
        nama_anggota, 
        kub,
        trip, 
        jenis_bbm, 
        jumlah_bbm_liter, 
        daerah_penangkapan, 
        keterangan, 
        detail_produksi(nama_ikan, jumlah_kg, harga_per_kg),
        domisili,
        bulan,
        tahun
    `);

    // Apply filters if parameters are provided
    if (domisili) query = query.eq('domisili', domisili);
    if (kub) query = query.eq('kub', kub);
    if (bulan) query = query.eq('bulan', bulan);
    if (tahun) query = query.eq('tahun', tahun);

    // Fetch filtered data
    const { data: monitoringData, error } = await query;

    if (error) {
        console.error("Gagal mengambil data:", error);
        return;
    }

    if (!monitoringData || monitoringData.length === 0) {
        console.error("Tidak ada data yang ditemukan");
        return;
    }

    // Buat workbook dan worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Monitoring Perikanan");

    // Atur lebar kolom
    worksheet.columns = [
        { width: 5 },   // No
        { width: 20 },  // Nama Anggota
        { width: 15 },  // Trip
        { width: 10 },  // Jumlah BBM - Jenis
        { width: 10 },  // Jumlah BBM - Liter
        { width: 20 },  // Daerah Penangkapan
        { width: 15 },  // Produksi (kg)
        { width: 15 },  // Nama Ikan
        { width: 10 },  // kg
        { width: 10 },  // Rp/kg
        { width: 15 },  // Jumlah
        { width: 20 }   // Keterangan
    ];

    const selectedBulan = bulan || monitoringData[0]?.bulan || '....';
    const selectedTahun = tahun || monitoringData[0]?.tahun || '....';
    const selectedDomisili = domisili || 'Semua Domisili';
    const selectedKUB = kub || 'Semua KUB';

    // Header utama
    worksheet.mergeCells('A1:L1');
    worksheet.getCell('A1').value = 'MONITORING DAN EVALUASI';
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A1').font = { bold: true, size: 14 };

    worksheet.mergeCells('A2:L2');
    worksheet.getCell('A2').value = 'PENERIMA BANTUAN SARANA DAN PRASARANA BIDANG PERIKANAN TANGKAP';
    worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A2').font = { bold: true, size: 12 };

    // Tambahkan baris untuk Bulan dan Tahun
    worksheet.mergeCells('A3:L3');
    worksheet.getCell('A3').value = `Bulan ${selectedBulan} Tahun ${selectedTahun}`;
    worksheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

    // Informasi tambahan
    worksheet.mergeCells('A4:B4');
    worksheet.getCell('A4').value = 'Kabupaten/Kota';
    worksheet.getCell('C4').value = `: ${selectedDomisili}`;

    worksheet.mergeCells('A5:B5');
    worksheet.getCell('A5').value = 'KUB';
    worksheet.getCell('C5').value = `: ${selectedKUB}`;

    // Header sub-kolom
    // Merge cells untuk Jumlah BBM
    worksheet.mergeCells('D6:E6');
    worksheet.getCell('D6').value = 'Jumlah BBM';
    worksheet.getCell('D6').alignment = { horizontal: 'center' };

    // Merge cells untuk Produksi (Kg)
    worksheet.mergeCells('H6:I6');
    worksheet.getCell('H6').value = 'Produksi (Kg)';
    worksheet.getCell('H6').alignment = { horizontal: 'center' };

    // Merge cells untuk Rp
    worksheet.mergeCells('J6:K6');
    worksheet.getCell('J6').value = 'Rp';
    worksheet.getCell('J6').alignment = { horizontal: 'center' };

    // Header tabel
    const headerRow = worksheet.addRow([
        'No', 'Nama Anggota', 'Trip (hari/jam)', 
        'Jenis', 'Liter', 
        'Daerah Penangkapan', 
        'Produksi (kg)',
        'Nama Ikan', 'kg', 
        'Rp/kg', 'Jumlah', 
        'Keterangan'
    ]);

    // Definisikan array untuk kolom yang perlu di-merge
    const mergeColumns = [
        { col: 'A', text: 'No' },
        { col: 'B', text: 'Nama Anggota' },
        { col: 'C', text: 'Trip (hari/jam)' },
        { col: 'F', text: 'Daerah Penangkapan' },
        { col: 'G', text: 'Produksi (kg)' },
        { col: 'L', text: 'Keterangan' }
    ];

    // Style for sub-header areas
    const subHeaderAreas = [
        { start: 'D', end: 'E', text: 'Jumlah BBM' },
        { start: 'H', end: 'I', text: 'Produksi (Kg)' },
        { start: 'J', end: 'K', text: 'Rp' }
    ];

    // Apply merging for columns without sub-headers
    mergeColumns.forEach(column => {
        worksheet.mergeCells(`${column.col}6:${column.col}7`);
        const mergedCell = worksheet.getCell(`${column.col}6`);
        mergedCell.value = column.text;
        mergedCell.alignment = { 
            horizontal: 'center', 
            vertical: 'middle', 
            wrapText: true 
        };
    });

    // Style sub-header areas
    subHeaderAreas.forEach(area => {
        const cell = worksheet.getCell(`${area.start}6`);
        cell.value = area.text;
        cell.alignment = { horizontal: 'center' };
        cell.font = { bold: true };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC0C0C0' }
        };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // Style header tabel
    if (headerRow) {
        headerRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    }

    // Style untuk sub-header
    const subHeaderCells = [
        worksheet.getCell('D6'), 
        worksheet.getCell('H6'), 
        worksheet.getCell('J6')
    ];
    subHeaderCells.forEach(cell => {
        cell.font = { bold: true };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC0C0C0' }
        };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // Tambahkan data ke worksheet
    let totalProduksi = 0;
    let totalNilai = 0;

    // Gunakan Array.forEach untuk iterasi, bukan Set
    monitoringData.forEach((monitoring: any, index: number) => {
        const detailProduksi = monitoring.detail_produksi || [];

        // Hitung total produksi untuk anggota ini
        const produksiTotal = detailProduksi.reduce((sum: number, p: DetailProduksi) => sum + p.jumlah_kg, 0);
        const nilaiTotal = detailProduksi.reduce((sum: number, p: DetailProduksi) => sum + (p.jumlah_kg * p.harga_per_kg), 0);

        // Jika tidak ada detail produksi, tambahkan baris kosong
        if (detailProduksi.length === 0) {
            const row = worksheet.addRow([
                index + 1, 
                monitoring.nama_anggota, 
                `${monitoring.trip} hari/jam`, 
                monitoring.jenis_bbm,
                `${monitoring.jumlah_bbm_liter} Liter`, 
                monitoring.daerah_penangkapan,
                '0', 
                '', '', '', '', 
                monitoring.keterangan || '-'
            ]);
            
            // Tambahkan border ke setiap sel
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
            return;
        }

        // Tambahkan baris untuk setiap detail produksi
        detailProduksi.forEach((produksi: DetailProduksi, prodIndex: number) => {
            const totalHarga = produksi.jumlah_kg * produksi.harga_per_kg;
            const row = worksheet.addRow([
                prodIndex === 0 ? index + 1 : '', 
                prodIndex === 0 ? monitoring.nama_anggota : '',
                prodIndex === 0 ? `${monitoring.trip} hari/jam` : '',
                prodIndex === 0 ? monitoring.jenis_bbm : '',
                prodIndex === 0 ? `${monitoring.jumlah_bbm_liter} Liter` : '',
                prodIndex === 0 ? monitoring.daerah_penangkapan : '',
                prodIndex === 0 ? produksiTotal : '',
                produksi.nama_ikan,
                produksi.jumlah_kg,
                produksi.harga_per_kg,
                `Rp${totalHarga.toLocaleString()}`,
                prodIndex === 0 ? (monitoring.keterangan || '-') : ''
            ]);

            // Tambahkan border ke setiap sel
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Tambahkan total untuk setiap anggota
        const totalRow = worksheet.addRow([
            '', '', '', '', '', 'Total', produksiTotal, '', '', '', `Rp${nilaiTotal.toLocaleString()}`, ''
        ]);
        totalRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFC7FFF8' }
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Tambahkan ke total keseluruhan
        totalProduksi += produksiTotal;
        totalNilai += nilaiTotal;
    });

    // Tambahkan baris total keseluruhan
    const grandTotalRow = worksheet.addRow([
        '', '', '', '', '', 'GRAND TOTAL', totalProduksi, '', '', '', `Rp${totalNilai.toLocaleString()}`, ''
    ]);
    grandTotalRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF000000' }
        };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // Buat file Excel dan unduh
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    // Gunakan URL.createObjectURL untuk mengunduh
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    
    // Format nama file berdasarkan parameter filter
    let fileName = "MonitoringData";
    if (bulan) fileName += `_${bulan}`;
    if (tahun) fileName += `_${tahun}`;
    if (domisili) fileName += `_${domisili}`;
    if (kub) fileName += `_${kub}`;
    
    link.download = `${fileName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export default exportToExcel;