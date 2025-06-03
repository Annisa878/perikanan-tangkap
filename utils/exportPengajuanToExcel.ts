import ExcelJS, { FillPattern } from "exceljs"; // Align import with exportToExcel.ts for default, and import FillPattern
import type { SupabaseClient } from "@supabase/supabase-js";

// Define types needed for the export function
// Ideally, these would be in a shared types file and imported.
// For this example, we'll define them here if they are directly used by the function's signature or critical internal logic.
interface PengajuanData {
  id_pengajuan: string; // Changed to string for UUID consistency
  kelompok_id: string;  // Changed to string for UUID consistency
  dokumen_pengajuan: string;
  wilayah_penangkapan: string;
  status_dokumen: string;
  status_verifikasi: string;
  status_verifikasi_kabid: string;
  catatan_verifikasi: string | null;
  catatan_verifikasi_kabid: string | null;
  created_at: string;
  nama_kub: string;
  alamat_kub?: string;
  kabupaten_kota?: string;
  no_bast?: string | null;
  total_keseluruhan?: number | null;
}

// Define DetailUsulan interface explicitly
interface DetailUsulan {
  nama_alat: string;
  jumlah_alat: number;
  harga_total: number;
}

// The Supabase client type might need to be more specific if you have a custom typed client
// For generic client: import { SupabaseClient } from '@supabase/supabase-js';

export const generatePengajuanExcelReport = async (
  pengajuanList: PengajuanData[],
  supabase: SupabaseClient
): Promise<{ success: boolean; message?: string }> => {
  if (pengajuanList.length === 0) {
    return { success: false, message: "Tidak ada data untuk diekspor." };
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Detail Usulan Pengajuan");

    // === Define Styles ===
    const allBorders: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' }, // Use string literal for consistency and to resolve TS2339
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    const headerFill: FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5A8D9A" } }; 
    const titleFill: FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2C5E7A" } }; 
    const totalFill: FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } }; 
    const grandTotalFill: FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };

    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" } }; 
    const boldFont: Partial<ExcelJS.Font> = { bold: true };
    const whiteFont: Partial<ExcelJS.Font> = { color: { argb: "FFFFFFFF" } }; 

    const excelDataRows: Record<string, any>[] = [];
    let pengajuanRowNumber = 1; // Renamed for clarity, this is the main submission number

    // --- Optimasi Pengambilan Data ---
    const kelompokIds = pengajuanList.map(p => p.kelompok_id);
    const pengajuanIds = pengajuanList.map(p => p.id_pengajuan);

    // 1. Ambil semua data ketua kelompok yang relevan dalam satu query
    const { data: semuaKetuaData, error: semuaKetuaError } = await supabase
      .from('anggota_kelompok')
      .select('kelompok_id, nama_anggota')
      .in('kelompok_id', kelompokIds)
      .eq('jabatan', 'ketua');

    if (semuaKetuaError) {
      console.error("Error fetching all ketua data:", semuaKetuaError);
      // Decide if this is a fatal error or if you can proceed with default names
    }
    const ketuaMap = new Map<string, string>();
    semuaKetuaData?.forEach(k => ketuaMap.set(k.kelompok_id, k.nama_anggota));

    // 2. Ambil semua detail usulan yang relevan dalam satu query
    const { data: semuaUsulanItems, error: semuaUsulanError } = await supabase
      .from('detail_usulan')
      .select('pengajuan_id, nama_alat, jumlah_alat, harga_total')
      .in('pengajuan_id', pengajuanIds);

    if (semuaUsulanError) {
      console.error("Error fetching all detail usulan:", semuaUsulanError);
      return { success: false, message: "Gagal mengambil detail usulan." };
    }
    const usulanMap = new Map<string, DetailUsulan[]>();
    semuaUsulanItems?.forEach(u => {
      if (!usulanMap.has(u.pengajuan_id)) {
        usulanMap.set(u.pengajuan_id, []);
      }
      usulanMap.get(u.pengajuan_id)?.push({
        nama_alat: u.nama_alat,
        jumlah_alat: u.jumlah_alat,
        harga_total: u.harga_total,
      });
    });
    // --- Akhir Optimasi Pengambilan Data ---

    for (const pengajuanItem of pengajuanList) {
      const namaKetua = ketuaMap.get(pengajuanItem.kelompok_id) || "Tidak Ada Data Ketua";
      const usulanItems = usulanMap.get(pengajuanItem.id_pengajuan) || [];

      if (!usulanItems || usulanItems.length === 0) {
        // Add a placeholder row if no items are proposed
        excelDataRows.push({
          "No.": pengajuanRowNumber,
          "Kabupaten/Kota": pengajuanItem.kabupaten_kota || "N/A",
          "Nama KUB": pengajuanItem.nama_kub,
          "Alamat KUB": pengajuanItem.alamat_kub || "N/A",
          "Nama Ketua": namaKetua,
          "Nama Alat": "-",
          "Jumlah": 0,
          "Total Harga": 0,
          "No.BAST": pengajuanItem.no_bast || "N/A",
        });
      } else {
        // Add a new row for each proposed item, but only fill main details on the first item's row
        usulanItems.forEach((detailItem, itemIndex) => {
          excelDataRows.push({
            // Main details only for the first item of this submission
            "No.": itemIndex === 0 ? pengajuanRowNumber : "", 
            "Kabupaten/Kota": itemIndex === 0 ? (pengajuanItem.kabupaten_kota || "N/A") : "",
            "Nama KUB": itemIndex === 0 ? pengajuanItem.nama_kub : "",
            "Alamat KUB": itemIndex === 0 ? (pengajuanItem.alamat_kub || "N/A") : "",
            "Nama Ketua": itemIndex === 0 ? namaKetua : "",
            "No.BAST": itemIndex === 0 ? (pengajuanItem.no_bast || "N/A") : "",
            
            // Item specific details for every row
            "Nama Alat": detailItem.nama_alat,
            "Jumlah": detailItem.jumlah_alat,
            "Total Harga": detailItem.harga_total,
          });
        });
      }
      pengajuanRowNumber++; // Increment for the next submission
    }

    const grandTotalJumlah = excelDataRows.reduce((sum, row) => sum + (Number(row["Jumlah"]) || 0), 0);
    const grandTotalHarga = excelDataRows.reduce((sum, row) => sum + (Number(row["Total Harga"]) || 0), 0);

    // === Penyesuaian Format Mirip exportToExcel.ts ===

    // 1. Atur Lebar Kolom (sesuaikan dengan jumlah kolom di 'headers')
    // Indeks kolom: No(0), Kab/Kota(1), Nama KUB(2), Alamat KUB(3), Nama Ketua(4), Nama Alat(5), Jumlah(6), Total Harga(7), No.BAST(8)
    worksheet.columns = [
      { width: 5 },   // No.
      { width: 20 },  // Kabupaten/Kota
      { width: 25 },  // Nama KUB
      { width: 30 },  // Alamat KUB
      { width: 20 },  // Nama Ketua
      { width: 25 },  // Nama Alat (Can be standard width as it's per row now)
      { width: 10 },  // Jumlah
      { width: 15 },  // Total Harga
      { width: 15 }   // No.BAST
    ];

    // 2. Header Utama Laporan
    const headers = [ // Define headers array before use for better readability
      "No.", "Kabupaten/Kota", "Nama KUB", "Alamat KUB", "Nama Ketua",
      "Nama Alat", "Jumlah", "Total Harga", "No.BAST"
    ];
    const title = "Laporan Detail Usulan Bantuan Perikanan Tangkap";
    worksheet.mergeCells(1, 1, 1, headers.length); // Baris 1, Kolom 1 sampai Kolom terakhir
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = title;
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } }; // Font putih
    titleCell.fill = titleFill; // Use titleFill style

    // Border untuk sel judul utama
    titleCell.border = allBorders;

    // Tambahkan baris untuk Tahun (Baris 2)
    // Anda bisa membuat tahun ini dinamis jika diperlukan, misalnya dari parameter fungsi atau data
    const currentYear = new Date().getFullYear(); // Contoh: menggunakan tahun saat ini
    worksheet.mergeCells(2, 1, 2, headers.length); // Baris 2, Kolom 1 sampai Kolom terakhir
    const subTitleCell = worksheet.getCell(2, 1); // Changed variable name for clarity
    subTitleCell.value = `Tahun ${currentYear}`;
    subTitleCell.alignment = { horizontal: "center", vertical: "middle" };
    subTitleCell.font = boldFont; // Use boldFont style

    // 3. Header Tabel (sekarang mulai dari baris ke-3)
    const headerRow = worksheet.addRow(headers); // Ini sekarang menjadi baris ke-3

    headerRow.eachCell((cell, colNumber) => {
      cell.font = headerFont; // Use headerFont style
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; // Align text and enable wrapping
      cell.fill = headerFill; // Use headerFill style
      cell.border = allBorders;
    });

    // === Add Data Rows ===
    // Iterate through the pre-processed excelDataRows
    let currentRowNumber = headerRow.number + 1; // Start data rows after the header
    let lastPengajuanNo: number | string | null = null;
    let mergeStartRow = currentRowNumber;

    excelDataRows.forEach((dataItem, index) => {
      const rowValues = headers.map(header => dataItem[header] === "" ? null : dataItem[header]); // Use null for empty strings to allow merging
      const row = worksheet.addRow(rowValues); // Add row to worksheet

      // Merging logic
      if (dataItem["No."] !== null && dataItem["No."] !== "") { // New pengajuan group starts
        if (lastPengajuanNo !== null && currentRowNumber > mergeStartRow +1) { // If previous group had multiple items
          // Merge cells for the previous group
          headers.forEach((header, colIdx) => {
            if (!["Nama Alat", "Jumlah", "Total Harga"].includes(header)) {
              worksheet.mergeCells(mergeStartRow, colIdx + 1, currentRowNumber -1 , colIdx + 1);
            }
          });
        }
        lastPengajuanNo = dataItem["No."];
        mergeStartRow = currentRowNumber;
      }

      // If this is the last row and it's part of a multi-item group, merge
      if (index === excelDataRows.length - 1 && currentRowNumber >= mergeStartRow +1 ) {
         headers.forEach((header, colIdx) => {
            if (!["Nama Alat", "Jumlah", "Total Harga"].includes(header)) {
              worksheet.mergeCells(mergeStartRow, colIdx + 1, currentRowNumber, colIdx + 1);
            }
          });
      }

      row.eachCell((cell, colNumber) => {
        cell.border = allBorders;
        cell.alignment = { vertical: "top", wrapText: true }; // Default alignment
        const headerName = headers[colNumber - 1]; // Corrected: Array is 0-based, but colNumber is 1-based

        switch (headerName) {
          case "No.":
            // Consistent alignment across all number cells, including the "No."
            cell.alignment = { horizontal: "right", vertical: "top" }; // Align number right
            if (typeof cell.value === 'number') cell.numFmt = '0';
            break;
          case "Jumlah":
          case "Total Harga":
            cell.alignment = { horizontal: "right", vertical: "top" };
            if (typeof cell.value === 'number') cell.numFmt = '#,##0';
            break;
          case "Kabupaten/Kota":
            // Consistent left alignment with wrapping for all text cells
          case "Nama KUB":
          case "Alamat KUB":
          case "Nama Ketua":
          case "No.BAST":
            cell.alignment = { horizontal: "left", vertical: "top", wrapText: true }; // Align text left
            break;
          default:
            cell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
            break;
        }
      });
      currentRowNumber++;
    });

    // === Add Grand Total Row ===
    // This uses the grandTotalJumlah and grandTotalHarga calculated from excelDataRows
    const grandTotalRow = worksheet.addRow([
        'GRAND TOTAL', '', '', '', '', '', // Label in "No." column, merge A to F
        grandTotalJumlah,
        grandTotalHarga,
        ''
    ]);
    // Merge cells for the "GRAND TOTAL" label
    worksheet.mergeCells(grandTotalRow.number, 1, grandTotalRow.number, 6); // Merge A to F

    grandTotalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { ...boldFont, ...whiteFont };
      cell.border = allBorders;
      cell.fill = grandTotalFill;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };

      if (headers[colNumber - 1] === "Jumlah" || headers[colNumber - 1] === "Total Harga") {
          if (typeof cell.value === 'number') cell.numFmt = '#,##0';
      }
    });

    // 6. AutoFilter pada baris header
    // Make sure row and column numbers are correct
    worksheet.autoFilter = {
      from: { row: headerRow.number, column: 1 }, // From the header row (row 2)
      to: { row: headerRow.number, column: headers.length } // To the last column of the header row
    };

    // 7. Buat file Excel dan unduh
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Laporan_Detail_Usulan_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { success: true };
  } catch (error) {
    console.error("Error generating Excel report:", error);
    return { success: false, message: "Gagal membuat laporan Excel." };
  }
};