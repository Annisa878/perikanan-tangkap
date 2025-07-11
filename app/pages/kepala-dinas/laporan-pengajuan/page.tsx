"use client";

import React, { useState, useEffect } from "react"; // Added React for React.Fragment
import { Inbox, FileText, Users, ListChecks, MessageSquare, CheckCircle, ShieldCheck, AlertTriangle, Loader2, ChevronDown, ChevronUp, CalendarDays, MapPin, Anchor, Ship } from "lucide-react"; // Relevant icons, Added Loader2, Chevrons
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Added for Domisili filter
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Ditambahkan untuk keseragaman tampilan header & tabel
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'; // Ditambahkan untuk tabel
import { Button } from '@/components/ui/button'; // Ditambahkan untuk tombol expand
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation"; // Though not strictly used for navigation yet, good for potential future use

// Define types
interface PengajuanData {
  id_pengajuan: number;
  kelompok_id: number;
  dokumen_pengajuan: string;
  wilayah_penangkapan: string;
  status_dokumen: string;
  status_verifikasi: string;
  status_verifikasi_kabid: string;
  catatan_verifikasi: string | null;
  catatan_verifikasi_kabid: string | null;
  created_at: string;
  tanggal_pengajuan: string; // Ditambahkan untuk konsistensi dengan halaman admin
  nama_kub: string; // Joined from kelompok table
  kabupaten_kota?: string | null; // Added for filtering by regency/city
  alamat_kub?: string | null; // Added for KUB address
  no_bast?: string | null; // Added for BAST number
  dokumen_bast?: string | null; // Added for BAST document path
  total_keseluruhan?: number; // Optional, if available directly
}

interface DetailUsulan {
  id_detail_usulan: number;
  pengajuan_id: number;
  nama_alat: string;
  jumlah_alat: number;
  harga_satuan: number;
  harga_total: number;
}

interface AnggotaKelompok {
  id_anggota: number;
  kelompok_id: number;
  nama_anggota: string;
  jabatan: string;
  nik: string;
  no_kusuka: string;
}

interface DokumenChecklist {
  proposal: boolean;
  surat_usulan: boolean;
  foto_ktp: boolean;
  surat_ktm: boolean;
  foto_rumah: boolean;
  foto_alat_tangkap: boolean;
  bpjs: boolean;
  kis: boolean;
  kartu_kusuka: boolean; // Added
  foto_kapal: boolean;   // Added
}

interface ExpandedPengajuanDetails {
  detailUsulan: DetailUsulan[];
  anggotaKelompok: AnggotaKelompok[];
  dokumenChecklist: DokumenChecklist;
  pengajuanData: PengajuanData; // Menyimpan data pengajuan lengkap untuk baris yang diperluas
}


const initialDokumenChecklist: DokumenChecklist = {
  proposal: false,
  surat_usulan: false,
  foto_ktp: false,
  surat_ktm: false,
  foto_rumah: false,
  foto_alat_tangkap: false,
  bpjs: false,
  kis: false,
  kartu_kusuka: false, // Added
  foto_kapal: false    // Added
};

// Daftar Kabupaten/Kota (sama seperti di laporan-akhir)
const DAFTAR_KABUPATEN_KOTA = [
  "Banyuasin",
  "Empat Lawang",
  "Muara Enim",
  "Musi Banyuasin",
  "Musi Rawas",
  "Musi Rawas Utara",
  "Ogan Ilir",
  "Ogan Komering Ilir",
  "Ogan Komering Ulu",
  "Ogan Komering Ulu Selatan",
  "Ogan Komering Ulu Timur",
  "Penukal Abab Lematang Ilir",
  "Lubuk Linggau",
  "Lahat",
  "Palembang",
  "Pagar Alam",
  "Prabumulih"
].sort();

export default function LaporanPengajuanDisetujuiPage() {
  const supabase = createClient();
  const router = useRouter(); // Available if needed
  const [isLoading, setIsLoading] = useState(true); // Loading untuk daftar utama
  const [pengajuanList, setPengajuanList] = useState<PengajuanData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [dokumenUrl, setDokumenUrl] = useState<string | null>(null);
  const [showBastModal, setShowBastModal] = useState(false);
  const [bastDokumenUrl, setBastDokumenUrl] = useState<string | null>(null);
  const [filterKabupatenKota, setFilterKabupatenKota] = useState<string>("all");

  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [expandedPengajuanDetails, setExpandedPengajuanDetails] = useState<ExpandedPengajuanDetails | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false); // Loading untuk detail yang diperluas

  // Fetch approved pengajuan data (daftar utama)
  useEffect(() => {
    const fetchApprovedPengajuan = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('pengajuan')
          .select(`
            id_pengajuan, kelompok_id, dokumen_pengajuan, wilayah_penangkapan, status_dokumen, status_verifikasi, status_verifikasi_kabid, catatan_verifikasi, catatan_verifikasi_kabid, created_at, tanggal_pengajuan, total_keseluruhan,
            kelompok:kelompok_id(nama_kub, alamat_kub, kabupaten_kota),
            no_bast,
            dokumen_bast
          `)
          .eq('status_verifikasi', 'Diterima') // Approved by Admin
          .in('status_verifikasi_kabid', ['Disetujui Sepenuhnya', 'Disetujui Sebagian']) // Approved by Kabid
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedData = data.map(item => {
          // Safely access kelompok data, handling if it's an object or an array (due to TS error/type inference)
          const kelompokInfo = Array.isArray(item.kelompok)
            ? (item.kelompok.length > 0 ? item.kelompok[0] : null)
            : item.kelompok; // If not an array, it should be the object or null

          return {
            ...item,
            nama_kub: kelompokInfo?.nama_kub || 'KUB Tidak Ditemukan',
            alamat_kub: kelompokInfo?.alamat_kub || null,
            kabupaten_kota: kelompokInfo?.kabupaten_kota || null,
          };
        }) as PengajuanData[];
        setPengajuanList(formattedData);
      } catch (error) {
        console.error("Error fetching approved pengajuan:", error);
        // Handle error display to user if necessary
      } finally {
        setIsLoading(false);
      }
    };
    fetchApprovedPengajuan();
  }, [supabase]);

  // Toggle expand/collapse row and fetch details if needed
  const toggleExpandRow = async (pengajuan: PengajuanData) => {
    if (expandedRowId === pengajuan.id_pengajuan) {
      setExpandedRowId(null);
      setExpandedPengajuanDetails(null);
      return;
    }
    setIsDetailLoading(true);
    setExpandedRowId(pengajuan.id_pengajuan); // Set immediately for UI responsiveness
    try {
      // Fetch detail usulan
      const { data: usulanData, error: usulanError } = await supabase
        .from('detail_usulan')
        .select('*')
        .eq('pengajuan_id', pengajuan.id_pengajuan);
      if (usulanError) throw usulanError;

      // Fetch anggota kelompok
      const { data: anggotaData, error: anggotaError } = await supabase
        .from('anggota_kelompok')
        .select('*')
        .eq('kelompok_id', pengajuan.kelompok_id);
      if (anggotaError) throw anggotaError;

      let parsedChecklist = initialDokumenChecklist;
      if (pengajuan.status_dokumen) {
        try {
          parsedChecklist = JSON.parse(pengajuan.status_dokumen);
        } catch (e) {
          console.error("Error parsing document checklist:", e);
        }
      }
        
      setExpandedPengajuanDetails({
        detailUsulan: usulanData as DetailUsulan[],
        anggotaKelompok: anggotaData as AnggotaKelompok[],
        dokumenChecklist: parsedChecklist,
        pengajuanData: pengajuan
      });
    } catch (error) {
      console.error("Error fetching details for expansion:", error);
      alert("Gagal memuat detail pengajuan.");
      setExpandedRowId(null); // Reset if error
      setExpandedPengajuanDetails(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Handle document preview
  const handlePreviewDocument = async () => {
    if (!expandedPengajuanDetails?.pengajuanData?.dokumen_pengajuan) return;

    try {
      const { data, error } = await supabase.storage
        .from('uploads')
        .createSignedUrl(expandedPengajuanDetails.pengajuanData.dokumen_pengajuan, 300); // 5 minutes validity

      if (error) {
        console.error("Storage error details (first attempt):", error);
        // If there's an error, try with URL encoding
        const encodedPath = encodeURIComponent(expandedPengajuanDetails.pengajuanData.dokumen_pengajuan);
        const { data: encodedData, error: encodedError } = await supabase.storage
          .from('uploads')
          .createSignedUrl(encodedPath, 300);

        if (encodedError) {
          console.error("Still failed with encoded path:", encodedError);
          throw encodedError; // Re-throw to be caught by the outer catch block
        }
        setDokumenUrl(encodedData.signedUrl);
      } else {
        setDokumenUrl(data.signedUrl);
      }
      setShowModal(true);

    } catch (error) {
      console.error("Error getting document URL:", error);

      // Alternative approach: try to get a public URL instead if signed URL fails
      try {
        const { data: publicData } = supabase.storage
          .from('uploads')
          .getPublicUrl(expandedPengajuanDetails.pengajuanData.dokumen_pengajuan);

        if (publicData && publicData.publicUrl) {
          console.log("Using public URL as fallback:", publicData.publicUrl);
          setDokumenUrl(publicData.publicUrl);
          setShowModal(true);
          return;
        }
      } catch (e: any) {
        console.error("Failed public URL fallback:", e);
      }
      alert("Gagal memuat dokumen. Detail error telah dicatat di konsol.");
    }
  };

  // Handle BAST document preview
  const handlePreviewBastDocument = async () => {
    if (!expandedPengajuanDetails?.pengajuanData?.dokumen_bast) return;

    try {
      const { data, error } = await supabase.storage
        .from('uploads') // Assuming BAST documents are also in 'uploads' bucket
        .createSignedUrl(expandedPengajuanDetails.pengajuanData.dokumen_bast, 300); // 5 minutes validity

      if (error) {
        console.error("Storage error details for BAST (first attempt):", error);
        const encodedPath = encodeURIComponent(expandedPengajuanDetails.pengajuanData.dokumen_bast);
        const { data: encodedData, error: encodedError } = await supabase.storage
          .from('uploads')
          .createSignedUrl(encodedPath, 300);

        if (encodedError) {
          console.error("Still failed with encoded path for BAST:", encodedError);
          throw encodedError;
        }
        setBastDokumenUrl(encodedData.signedUrl);
      } else {
        setBastDokumenUrl(data.signedUrl);
      }
      setShowBastModal(true);
    } catch (error) {
      console.error("Error getting BAST document URL:", error);
      try {
        const { data: publicData } = supabase.storage
          .from('uploads')
          .getPublicUrl(expandedPengajuanDetails.pengajuanData.dokumen_bast);

        if (publicData && publicData.publicUrl) {
          setBastDokumenUrl(publicData.publicUrl);
          setShowBastModal(true);
          return;
        }
      } catch (e: any) { console.error("Failed public BAST URL fallback:", e); }
      alert("Gagal memuat dokumen BAST. Detail error telah dicatat di konsol.");
    }
  };
  // Get status badge color
  const getStatusBadgeColor = (status: string | null | undefined) => {
    switch (status) {
      case "Diterima": return "bg-green-100 text-green-700 dark:bg-green-700/40 dark:text-green-300 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/30";
      case "Disetujui Sepenuhnya":
        return "bg-green-100 text-green-700 dark:bg-green-700/40 dark:text-green-300 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/30";
      case "Disetujui Sebagian":
        return "bg-sky-100 text-sky-700 dark:bg-sky-700/40 dark:text-sky-300 ring-1 ring-inset ring-sky-600/20 dark:ring-sky-500/30";
      case "Ditolak": return "bg-red-100 text-red-700 dark:bg-red-700/40 dark:text-red-300 ring-1 ring-inset ring-red-600/20 dark:ring-red-500/30";
      default: // Menunggu or null
        return "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300 ring-1 ring-inset ring-slate-600/20 dark:ring-slate-500/30";
    }
  };

  const renderChecklistItem = (label: string, checked: boolean) => (
    <label className="flex items-center cursor-not-allowed opacity-70">
      <input
        type="checkbox"
        checked={checked}
        disabled
        className="mr-2 h-4 w-4 text-sky-600 border-slate-300 dark:border-slate-600 rounded focus:ring-sky-500"
      />
      <span className="text-slate-700 dark:text-slate-300">{label}</span>
    </label>
  );

  // Filter pengajuan list based on domisili
  const filteredPengajuanList = React.useMemo(() => {
    if (filterKabupatenKota === "all") {
      return pengajuanList;
    }
    return pengajuanList.filter(
      (item) => item.kabupaten_kota === filterKabupatenKota
    );
  }, [pengajuanList, filterKabupatenKota]);

  // Menentukan daftar kabupaten/kota yang akan diiterasi untuk pengelompokan
  // Ini tidak lagi digunakan untuk pengelompokan visual, tapi bisa berguna jika ada logika lain
  const kabupatenKotaToDisplay = React.useMemo(() => {
    if (filterKabupatenKota === "all") {
      return DAFTAR_KABUPATEN_KOTA; 
    }
    return DAFTAR_KABUPATEN_KOTA.filter(kabKota => kabKota === filterKabupatenKota);
  }, [filterKabupatenKota]); 

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  return (
    // Applied main background gradient and layout from kepala-bidang page
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-900 dark:to-cyan-950 text-slate-700 dark:text-slate-200">
      {/* Header - Consistent with kepala-bidang page */}
      <header className="bg-white/70 dark:bg-sky-950/70 backdrop-blur-md py-4 shadow-md sticky top-0 z-40 border-b border-sky-300/70 dark:border-sky-800/70">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-xl md:text-2xl font-semibold flex items-center text-sky-700 dark:text-sky-300">
            <Ship className="mr-2.5 h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            Laporan Pengajuan Bantuan {/* Or just the icon if preferred */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6 md:py-8 px-4 md:px-6 flex-1 space-y-6 md:space-y-8">

        {/* Main Card for Daftar Pengajuan - Styling consistent with dashboard content cards */}
        <Card className="w-full bg-white dark:bg-sky-900 shadow-xl border border-sky-200 dark:border-sky-700">
          <CardHeader className="border-b border-slate-200 dark:border-sky-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-lg md:text-xl text-sky-700 dark:text-sky-300 shrink-0">Daftar Pengajuan Disetujui</CardTitle>
            <div className="w-full sm:w-auto sm:min-w-[250px]">
              <Select value={filterKabupatenKota} onValueChange={setFilterKabupatenKota}>
                <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500">
                  <SelectValue placeholder="Filter Kabupaten/Kota..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kabupaten/Kota</SelectItem>
                  {DAFTAR_KABUPATEN_KOTA.map(kabKota => (
                    <SelectItem key={kabKota} value={kabKota}>
                      {kabKota}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-sky-500 dark:text-sky-400" />
            </div>
          ) : filteredPengajuanList.length === 0 ? (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
              <Inbox size={48} className="mx-auto mb-4 text-sky-400" />
              <p className="text-lg">Tidak ada data pengajuan yang disetujui.</p>
              {filterKabupatenKota !== "all" && <p className="text-sm">Coba pilih "Semua Kabupaten/Kota" atau filter lain.</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-sky-100 dark:bg-sky-700/50">
                  <TableRow>
                    <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">No</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Nama KUB</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Wilayah</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Kab/Kota</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Tgl. Pengajuan</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Waktu</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase text-center">Status Admin</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase text-center">Status Kabid</TableHead>
                    <TableHead className="w-[80px] px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase text-center">Aksi</TableHead>
                  </TableRow></TableHeader>
                <TableBody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredPengajuanList.map((item, index) => {
                    const rowElements = [];

                    // Main Row
                    rowElements.push(
                      <TableRow
                        key={item.id_pengajuan}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${expandedRowId === item.id_pengajuan ? 'bg-sky-50 dark:bg-sky-700/20' : ''}`}
                      >
                        <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200">{index + 1}</TableCell>
                        <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200 font-medium">{item.nama_kub}</TableCell>
                        <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200">{item.wilayah_penangkapan === 'perairan_umum_daratan' ? 'Perairan Daratan' : 'Laut'}</TableCell>
                        <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200">{item.kabupaten_kota || '-'}</TableCell>
                        <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {new Date(item.tanggal_pengajuan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {new Date(item.tanggal_pengajuan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadgeColor(item.status_verifikasi)}`}>
                            {item.status_verifikasi || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadgeColor(item.status_verifikasi_kabid)}`}>
                            {item.status_verifikasi_kabid || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm" // Changed from "icon" to "sm" to allow text
                            onClick={() => toggleExpandRow(item)}
                            className="h-8 px-2 text-xs" // Adjusted padding
                            disabled={isDetailLoading && expandedRowId === item.id_pengajuan}
                          >
                            {isDetailLoading && expandedRowId === item.id_pengajuan ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <span className="flex items-center">
                                Detail {expandedRowId === item.id_pengajuan ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                              </span>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );

                    // Expanded Row (conditionally)
                    if (expandedRowId === item.id_pengajuan && expandedPengajuanDetails) {
                      rowElements.push(
                        <TableRow
                          key={`${item.id_pengajuan}-expanded`}
                          className="bg-white dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-800">
                          <TableCell colSpan={9} className="p-0"> {/* Updated colSpan to 9 */}
                            <div className="p-4 md:p-6 border-t-2 border-sky-300 dark:border-sky-600 bg-sky-50/30 dark:bg-sky-800/10"> {/* Matched expanded row container style */}
                              {isDetailLoading ? (
                                <div className="flex justify-center items-center py-10">
                                  <Loader2 className="h-8 w-8 animate-spin text-sky-500 dark:text-sky-400" />
                                  <p className="ml-2 text-slate-600 dark:text-slate-300">Memuat detail...</p>
                                </div>
                              ) : expandedPengajuanDetails ? (
                                <div className="space-y-6">
                                  {/* Informasi Umum Section */}
                                  <div className="p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-sky-50/50 dark:bg-sky-800/20"> {/* Matched section style */}
                                    <h3 className="text-lg font-semibold mb-3 text-sky-700 dark:text-sky-300 flex items-center">
                                      <FileText size={20} className="mr-2" /> Informasi Umum Pengajuan: {expandedPengajuanDetails.pengajuanData.nama_kub}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                      <div className="flex items-center">
                                        <Users size={16} className="mr-2 text-sky-600 dark:text-sky-400" />
                                        <strong className="text-slate-600 dark:text-slate-300 w-32">Nama KUB:</strong>
                                        <span className="text-slate-800 dark:text-slate-100">{expandedPengajuanDetails.pengajuanData.nama_kub}</span>
                                      </div>
                                      <div className="flex items-center">
                                        <MapPin size={16} className="mr-2 text-sky-600 dark:text-sky-400" />
                                        <strong className="text-slate-600 dark:text-slate-300 w-32">Kab/Kota:</strong>
                                        <span className="text-slate-800 dark:text-slate-100">{expandedPengajuanDetails.pengajuanData.kabupaten_kota || '-'}</span>
                                      </div>
                                      <div className="flex items-center">
                                        <Anchor size={16} className="mr-2 text-sky-600 dark:text-sky-400" />
                                        <strong className="text-slate-600 dark:text-slate-300 w-32">Wilayah:</strong>
                                        <span className="text-slate-800 dark:text-slate-100">{expandedPengajuanDetails.pengajuanData.wilayah_penangkapan === 'perairan_umum_daratan' ? 'Perairan Daratan' : 'Laut'}</span>
                                      </div>
                                      <div className="flex items-center">
                                        <CalendarDays size={16} className="mr-2 text-sky-600 dark:text-sky-400" />
                                        <strong className="text-slate-600 dark:text-slate-300 w-32">Tgl. Pengajuan:</strong>
                                        <span className="text-slate-800 dark:text-slate-100">{new Date(expandedPengajuanDetails.pengajuanData.tanggal_pengajuan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                      </div>
                                      <div className="md:col-span-2 flex items-start">
                                        <MapPin size={16} className="mr-2 mt-0.5 text-sky-600 dark:text-sky-400" />
                                        <strong className="text-slate-600 dark:text-slate-300 w-32 shrink-0">Alamat KUB:</strong>
                                        <span className="text-slate-800 dark:text-slate-100">{expandedPengajuanDetails.pengajuanData.alamat_kub || '-'}</span>
                                      </div>
                                      {expandedPengajuanDetails.pengajuanData.no_bast && (
                                        <div className="flex items-center">
                                          <FileText size={16} className="mr-2 text-sky-600 dark:text-sky-400" />
                                          <strong className="text-slate-600 dark:text-slate-300 w-32">No. BAST:</strong>
                                          <span className="text-slate-800 dark:text-slate-100">{expandedPengajuanDetails.pengajuanData.no_bast}</span>
                                        </div>
                                      )}
                                       <div>
                                        <strong className="text-slate-600 dark:text-slate-300 block mb-0.5">Status Admin:</strong>
                                        <span className={`px-2 py-0.5 rounded-full font-medium text-xs ${getStatusBadgeColor(expandedPengajuanDetails.pengajuanData.status_verifikasi)}`}>
                                          <CheckCircle className="inline h-3 w-3 mr-1" /> {expandedPengajuanDetails.pengajuanData.status_verifikasi}
                                        </span>
                                      </div>
                                      <div>
                                        <strong className="text-slate-600 dark:text-slate-300 block mb-0.5">Status Kabid:</strong>
                                        <span className={`px-2 py-0.5 rounded-full font-medium text-xs ${getStatusBadgeColor(expandedPengajuanDetails.pengajuanData.status_verifikasi_kabid)}`}>
                                          <ShieldCheck className="inline h-3 w-3 mr-1" /> {expandedPengajuanDetails.pengajuanData.status_verifikasi_kabid}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-sky-200 dark:border-sky-700/50 space-y-2">
                                      {expandedPengajuanDetails.pengajuanData.dokumen_pengajuan && (
                                        <button
                                          onClick={handlePreviewDocument}
                                          className="text-sm text-sky-600 dark:text-sky-400 hover:underline flex items-center"
                                        >
                                          <FileText size={16} className="mr-1" /> Lihat Dokumen Pengajuan
                                        </button>
                                      )}
                                      {expandedPengajuanDetails.pengajuanData.dokumen_bast && (
                                        <button onClick={handlePreviewBastDocument} className="text-sm text-sky-600 dark:text-sky-400 hover:underline flex items-center">
                                          <FileText size={16} className="mr-1" /> Lihat Dokumen BAST
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Detail Usulan Alat Tangkap */}
                                  <div className="p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-sky-50/50 dark:bg-sky-800/20"> {/* Matched section style */}
                                    <h3 className="text-lg font-semibold mb-3 text-sky-700 dark:text-sky-300 flex items-center"><Ship className="mr-2 h-5 w-5" />Detail Usulan Alat</h3>
                                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                      <Table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                        <TableHeader className="bg-sky-100 dark:bg-sky-700/50">
                                          <TableRow>
                                            <TableHead className="px-4 py-3 text-left text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">Nama Alat</TableHead>
                                            <TableHead className="px-4 py-3 text-right text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">Jumlah</TableHead>
                                            <TableHead className="px-4 py-3 text-right text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">Harga Satuan</TableHead>
                                            <TableHead className="px-4 py-3 text-right text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">Harga Total</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                          {expandedPengajuanDetails.detailUsulan.length > 0 ? (
                                            expandedPengajuanDetails.detailUsulan.map((detail) => (
                                              <TableRow key={detail.id_detail_usulan} className="hover:bg-sky-50 dark:hover:bg-sky-700/20">
                                                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200">{detail.nama_alat}</TableCell>
                                                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-right text-slate-700 dark:text-slate-200">{detail.jumlah_alat}</TableCell>
                                                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-right text-slate-700 dark:text-slate-200">{formatCurrency(detail.harga_satuan)}</TableCell>
                                                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-right text-slate-700 dark:text-slate-200">{formatCurrency(detail.harga_total || detail.jumlah_alat * (detail.harga_satuan || 0))}</TableCell>
                                              </TableRow>
                                            ))
                                          ) : (
                                            <TableRow><TableCell colSpan={4} className="text-center py-4 text-slate-500 dark:text-slate-400">Tidak ada detail usulan alat.</TableCell></TableRow>
                                          )}
                                          {expandedPengajuanDetails.detailUsulan.length > 0 && (
                                            <TableRow className="bg-sky-100 dark:bg-sky-700/50 font-semibold">
                                              <TableCell colSpan={3} className="px-4 py-3 text-right text-sky-700 dark:text-sky-200">Total Keseluruhan:</TableCell>
                                              <TableCell className="px-4 py-3 text-right text-sky-700 dark:text-sky-200">
                                                {formatCurrency(expandedPengajuanDetails.detailUsulan.reduce((sum, item) => sum + (item.harga_total || item.jumlah_alat * (item.harga_satuan || 0)),0))}
                                              </TableCell>
                                            </TableRow>
                                          )}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>

                                  {/* Anggota Kelompok Section */}
                                  <div className="p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-sky-50/50 dark:bg-sky-800/20"> {/* Matched section style */}
                                    <h3 className="text-lg font-semibold mb-3 text-sky-700 dark:text-sky-300 flex items-center"><Users className="mr-2 h-5 w-5" />Anggota Kelompok</h3>
                                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                      <Table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                        <TableHeader className="bg-sky-100 dark:bg-sky-700/50">
                                          <TableRow>
                                            <TableHead className="px-4 py-3 text-left text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">Nama</TableHead>
                                            <TableHead className="px-4 py-3 text-left text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">Jabatan</TableHead>
                                            <TableHead className="px-4 py-3 text-left text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">NIK</TableHead>
                                            <TableHead className="px-4 py-3 text-left text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">No. Kusuka</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                          {expandedPengajuanDetails.anggotaKelompok.length > 0 ? (
                                            expandedPengajuanDetails.anggotaKelompok.map((anggota) => (
                                              <TableRow key={anggota.id_anggota} className="hover:bg-sky-50 dark:hover:bg-sky-700/20">
                                                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200">{anggota.nama_anggota}</TableCell>
                                                <TableCell className="px-4 py-3 whitespace-nowrap text-sm capitalize text-slate-700 dark:text-slate-200">{anggota.jabatan}</TableCell>
                                                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200">{anggota.nik}</TableCell>
                                                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200">{anggota.no_kusuka}</TableCell>
                                              </TableRow>
                                            ))
                                          ) : (
                                            <TableRow><TableCell colSpan={4} className="text-center py-4 text-slate-500 dark:text-slate-400">Tidak ada data anggota kelompok.</TableCell></TableRow>
                                          )}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>

                                  {/* Verifikasi Dokumen (Read-only) */}
                                  <div className="p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-sky-50/50 dark:bg-sky-800/20"> {/* Matched section style */}
                                    <h3 className="text-lg font-semibold mb-3 text-sky-700 dark:text-sky-300 flex items-center"><ListChecks className="mr-2 h-5 w-5 text-green-500" />Kelengkapan Dokumen (Diverifikasi Admin)</h3>
                                    <div className="p-4 border border-sky-100 dark:border-sky-700/50 rounded-lg bg-white dark:bg-slate-800/50"> {/* Inner div slightly different bg for contrast if needed, or remove for full consistency */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                        {renderChecklistItem("Proposal", expandedPengajuanDetails.dokumenChecklist.proposal)}
                                        {renderChecklistItem("Surat Usulan", expandedPengajuanDetails.dokumenChecklist.surat_usulan)}
                                        {renderChecklistItem("Foto KTP", expandedPengajuanDetails.dokumenChecklist.foto_ktp)}
                                        {renderChecklistItem("Surat KTM", expandedPengajuanDetails.dokumenChecklist.surat_ktm)}
                                        {renderChecklistItem("Foto Rumah", expandedPengajuanDetails.dokumenChecklist.foto_rumah)}
                                        {renderChecklistItem("Foto Alat Tangkap", expandedPengajuanDetails.dokumenChecklist.foto_alat_tangkap)}
                                        {renderChecklistItem("BPJS", expandedPengajuanDetails.dokumenChecklist.bpjs)}
                                        {renderChecklistItem("KIS", expandedPengajuanDetails.dokumenChecklist.kis)}
                                        {renderChecklistItem("Kartu Kusuka", expandedPengajuanDetails.dokumenChecklist.kartu_kusuka)}
                                        {renderChecklistItem("Foto Kapal", expandedPengajuanDetails.dokumenChecklist.foto_kapal)}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Catatan Verifikasi */}
                                  {(expandedPengajuanDetails.pengajuanData.catatan_verifikasi || expandedPengajuanDetails.pengajuanData.catatan_verifikasi_kabid) && (
                                    <div className="p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-sky-50/50 dark:bg-sky-800/20"> {/* Matched section style */}
                                      <h3 className="text-lg font-semibold mb-2 text-sky-700 dark:text-sky-300 flex items-center"><MessageSquare className="mr-2 h-5 w-5" />Catatan Verifikasi</h3>
                                      <div className="space-y-3">
                                        {expandedPengajuanDetails.pengajuanData.catatan_verifikasi && (
                                          <div className="p-3 bg-sky-50 dark:bg-sky-800/30 rounded-lg border border-sky-200 dark:border-sky-700">
                                            <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">Catatan Admin:</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 italic">{expandedPengajuanDetails.pengajuanData.catatan_verifikasi}</p>
                                          </div>
                                        )}
                                        {expandedPengajuanDetails.pengajuanData.catatan_verifikasi_kabid && (
                                          <div className="p-3 bg-sky-50 dark:bg-sky-800/30 rounded-lg border border-sky-200 dark:border-sky-700">
                                            <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">Catatan Kepala Bidang:</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 italic">{expandedPengajuanDetails.pengajuanData.catatan_verifikasi_kabid}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }
                    return rowElements; // React can render an array of elements
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Preview Modal */}
      {showModal && dokumenUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"> {/* Matched modal overlay and z-index */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-11/12 md:w-3/4 lg:w-2/3 max-h-[90vh] flex flex-col"> {/* Matched modal dimensions and style */}
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700"> {/* Matched modal header */}
              <h3 className="font-semibold text-lg text-sky-700 dark:text-sky-200">Pratinjau Dokumen Pengajuan</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setDokumenUrl(null);
                }}
                className="text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-300 transition-colors" /* Matched close button style */
                aria-label="Tutup modal"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 p-1 md:p-4 overflow-auto">
              <iframe
                src={dokumenUrl || undefined}
                className="w-full h-full border-0 rounded"
                title="Document Preview"
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* BAST Document Preview Modal */}
      {showBastModal && bastDokumenUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"> {/* Matched modal overlay and z-index */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-11/12 md:w-3/4 lg:w-2/3 max-h-[90vh] flex flex-col"> {/* Matched modal dimensions and style */}
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700"> {/* Matched modal header */}
              <h3 className="font-semibold text-lg text-sky-700 dark:text-sky-200">Pratinjau Dokumen BAST</h3>
              <button
                onClick={() => {
                  setShowBastModal(false);
                  setBastDokumenUrl(null);
                }}
                className="text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-300 transition-colors" /* Matched close button style */
                aria-label="Tutup modal BAST"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 p-1 md:p-4 overflow-auto">
              <iframe
                src={bastDokumenUrl || undefined}
                className="w-full h-full border-0 rounded"
                title="BAST Document Preview"
              ></iframe>
            </div>
          </div>
        </div>
      )}
      </main>

      {/* Footer - Consistent with dashboard */}
      <footer className="py-4 text-center text-sm text-slate-500 dark:text-slate-400 border-t border-sky-200 dark:border-sky-700">
        
      </footer>
    </div>    
  );
}