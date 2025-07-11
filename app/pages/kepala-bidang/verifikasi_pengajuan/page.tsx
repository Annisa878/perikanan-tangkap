"use client";

import React, { useState, useEffect } from "react"; // Added React for React.Fragment
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Added
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Added
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, FileText, Users, ListChecks, MessageSquare, Loader2, Inbox, Ship, MapPin, CalendarDays, Anchor } from 'lucide-react'; // Added Inbox, Ship, MapPin, CalendarDays, Anchor

// Define types
interface PengajuanData {
  id_pengajuan: number;
  kelompok_id: number;
  dokumen_pengajuan: string;
  wilayah_penangkapan: string;
  status_dokumen: string;
  status_verifikasi: string;
  status_verifikasi_kabid?: string;
  catatan_verifikasi: string | null;
  catatan_verifikasi_kabid?: string | null;
  created_at: string;
  tanggal_pengajuan: string; // Added
  nama_kub: string;
  alamat_kub: string; // Added
  kabupaten_kota: string; // Added
  kelompok?: {
    nama_kub: string;
    alamat_kub?: string; // Added
    kabupaten_kota?: string; // Added
  };
}

interface DetailUsulan {
  id_detail_usulan: number;
  pengajuan_id: number;
  nama_alat: string;
  jumlah_alat: number;
  jumlah_disetujui: number | null;
  status_item: string | null;
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

// Daftar Kabupaten/Kota (konsisten dengan halaman lain)
const DAFTAR_KABUPATEN_KOTA = [
  "Banyuasin", "Empat Lawang", "Muara Enim", "Musi Banyuasin", "Musi Rawas",
  "Musi Rawas Utara", "Ogan Ilir", "Ogan Komering Ilir", "Ogan Komering Ulu",
  "Ogan Komering Ulu Selatan", "Ogan Komering Ulu Timur", "Penukal Abab Lematang Ilir",
  "Lubuk Linggau", "Lahat", "Palembang", "Pagar Alam", "Prabumulih"
].sort();


export default function VerifikasiPengajuan() {
  const supabase = createClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [pengajuanList, setPengajuanList] = useState<PengajuanData[]>([]);
  const [selectedPengajuan, setSelectedPengajuan] = useState<PengajuanData | null>(null);
  const [detailUsulan, setDetailUsulan] = useState<DetailUsulan[]>([]);
  const [anggotaKelompok, setAnggotaKelompok] = useState<AnggotaKelompok[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [dokumenUrl, setDokumenUrl] = useState<string | null>(null);
  const [dokumenChecklist, setDokumenChecklist] = useState<DokumenChecklist>({
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
  });

  const [catatan, setCatatan] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [filterKabupatenKota, setFilterKabupatenKota] = useState<string>("all"); // State for Kabupaten/Kota filter

  // Fetch all pengajuan data
  useEffect(() => {
    const fetchPengajuan = async () => {
      setIsLoading(true);
      try {
        // Join pengajuan with kelompok to get nama_kub
        const { data, error } = await supabase
          .from('pengajuan')
          .select(`
            id_pengajuan, kelompok_id, dokumen_pengajuan, wilayah_penangkapan, status_dokumen, status_verifikasi, status_verifikasi_kabid, catatan_verifikasi, catatan_verifikasi_kabid, created_at, tanggal_pengajuan,
            kelompok:kelompok_id(nama_kub, alamat_kub, kabupaten_kota)
          `)
          .eq('status_verifikasi', 'Diterima')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data) {
          setPengajuanList([]);
          return;
        }

        // Transform data
        const formattedData = data.map(item => {
          // Handle item.kelompok possibly being an array (as suggested by TS errors if they occurred) or an object.
          // Supabase typically returns an object for a to-one relation. This handles it robustly.
          const kelompokData = Array.isArray(item.kelompok)
            ? (item.kelompok.length > 0 ? item.kelompok[0] : null)
            : item.kelompok;
          return {
            ...item, // Spread original item properties
            nama_kub: kelompokData?.nama_kub || "KUB Tidak Ditemukan",
            alamat_kub: kelompokData?.alamat_kub || "Alamat Tidak Ditemukan",
            kabupaten_kota: kelompokData?.kabupaten_kota || "Kab/Kota Tidak Ditemukan",
            kelompok: kelompokData || undefined, // Ensure the 'kelompok' property matches PengajuanData (object or undefined)
          };
        }) as PengajuanData[];

        setPengajuanList(formattedData);
      } catch (error) {
        console.error("Error fetching pengajuan:", error);
        alert("Gagal memuat data pengajuan");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPengajuan();
  }, []);

  // Toggle expand/collapse row and fetch details
  const toggleExpandRow = async (pengajuan: PengajuanData) => {
    if (expandedRowId === pengajuan.id_pengajuan) {
      setExpandedRowId(null);
      setSelectedPengajuan(null);
      setDetailUsulan([]);
      setAnggotaKelompok([]);
      setCatatan("");
      setDokumenChecklist({ proposal: false, surat_usulan: false, foto_ktp: false, surat_ktm: false, 
                            foto_rumah: false, foto_alat_tangkap: false, bpjs: false, kis: false,
                            kartu_kusuka: false, foto_kapal: false }); // Added
      return;
    }

    setIsDetailLoading(true);
    setSelectedPengajuan(pengajuan);
    setExpandedRowId(pengajuan.id_pengajuan);

    try {
      // Clear previous details first
      setDetailUsulan([]); setAnggotaKelompok([]); setCatatan("");
      // Fetch detail usulan
      const { data: usulanData, error: usulanError } = await supabase
        .from('detail_usulan')
        .select('*')
        .eq('pengajuan_id', pengajuan.id_pengajuan);

      if (usulanError) throw usulanError;
      
      if (!usulanData) {
        setDetailUsulan([]);
      } else {
        // Initialize jumlah_disetujui with the same value as jumlah_alat if null
        const usulanWithDefaultValues = usulanData.map(item => ({
          ...item,
          jumlah_disetujui: item.jumlah_disetujui === null ? item.jumlah_alat : item.jumlah_disetujui,
          status_item: item.status_item || "pending"
        }));
        
        setDetailUsulan(usulanWithDefaultValues as DetailUsulan[]);
      }

      // Fetch anggota kelompok
      const { data: anggotaData, error: anggotaError } = await supabase
        .from('anggota_kelompok')
        .select('*')
        .eq('kelompok_id', pengajuan.kelompok_id);

      if (anggotaError) throw anggotaError;
      setAnggotaKelompok(anggotaData as AnggotaKelompok[] || []);

      // Parse status_dokumen if it exists
      if (pengajuan.status_dokumen) {
        try {
          const parsedChecklist = JSON.parse(pengajuan.status_dokumen);
          setDokumenChecklist(parsedChecklist);
        } catch (e) {
          console.error("Error parsing document checklist:", e);
          // Reset to defaults if there's an error
          setDokumenChecklist({
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
          });
        }
      }

      setCatatan(pengajuan.catatan_verifikasi_kabid || "");

    } catch (error) {
      console.error("Error fetching details:", error);
      alert("Gagal memuat detail pengajuan");
      setExpandedRowId(null); setSelectedPengajuan(null); // Reset on error
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Handle document preview
  const handlePreviewDocument = async () => {
    if (!selectedPengajuan) return;

    try {
      // Create a signed URL with the complete path
      const { data, error } = await supabase.storage
        .from('uploads')
        .createSignedUrl(selectedPengajuan.dokumen_pengajuan, 60);

      if (error) {
        console.error("Storage error details:", error);
        throw error;
      }

      if (data && data.signedUrl) {
        setDokumenUrl(data.signedUrl);
        setShowModal(true);
      }
    } catch (error) {
      console.error("Error getting document URL:", error);
      
      // Try to get a public URL instead
      try {
        const { data: publicData } = supabase.storage
          .from('uploads')
          .getPublicUrl(selectedPengajuan.dokumen_pengajuan);

        if (publicData && publicData.publicUrl) {
          setDokumenUrl(publicData.publicUrl);
          setShowModal(true);
          return;
        }
      } catch (e) {
        console.error("Failed public URL fallback:", e);
      }

      alert("Gagal memuat dokumen. Detail error telah dicatat di konsol.");
    }
  };

  // Handle updating approved quantity
  const handleApprovedQuantityChange = (id: number, value: number) => {
    setDetailUsulan(
      detailUsulan.map(item =>
        item.id_detail_usulan === id ? { ...item, jumlah_disetujui: value } : item
      )
    );
  };

  // Handle item status change
  const handleItemStatusChange = (id: number, status: string) => {
    setDetailUsulan(
      detailUsulan.map(item =>
        item.id_detail_usulan === id ? { ...item, status_item: status } : item
      )
    );
  };

  // Save verification decision
  const saveVerificationDecision = async () => {
    if (!selectedPengajuan) return;
    setIsDetailLoading(true); // Use detail loading for save action feedback

    try {
      // Update each detail_usulan item
      for (const item of detailUsulan) {
        const { error } = await supabase
          .from('detail_usulan')
          .update({
            jumlah_disetujui: item.jumlah_disetujui,
            status_item: item.status_item
          })
          .eq('id_detail_usulan', item.id_detail_usulan);

        if (error) throw error;
      }

      // Determine overall status
      let overallStatus = "Disetujui Sebagian";
      
      // If all items are approved with full quantity
      const allFullyApproved = detailUsulan.every(
        item => item.status_item === "approved" && item.jumlah_disetujui === item.jumlah_alat
      );
      
      // If all items are rejected
      const allRejected = detailUsulan.every(
        item => item.status_item === "rejected"
      );
      
      if (allFullyApproved) {
        overallStatus = "Disetujui Sepenuhnya";
      } else if (allRejected) {
        overallStatus = "Ditolak";
      }

      // Update the pengajuan status
      const { error: updateError } = await supabase
        .from('pengajuan')
        .update({
          status_verifikasi_kabid: overallStatus,
          catatan_verifikasi_kabid: catatan
        })
        .eq('id_pengajuan', selectedPengajuan.id_pengajuan);

      if (updateError) throw updateError;

      // Update local state
      setPengajuanList(
        pengajuanList.map(item =>
          item.id_pengajuan === selectedPengajuan.id_pengajuan
            ? {
              ...item,
              status_verifikasi_kabid: overallStatus,
              catatan_verifikasi_kabid: catatan
            }
            : item
        )
      );

      // No need to update selectedPengajuan directly if it will be nulled in finally

      window.alert("Data berhasil disimpan");

    } finally {
      setSelectedPengajuan(null);
      setDetailUsulan([]);
      setAnggotaKelompok([]);
      setCatatan("");
      setDokumenChecklist({ // Reset checklist to initial state
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
      });
      setExpandedRowId(null); // Collapse the row
      setIsDetailLoading(false); // Turn off loading state
    }
  };

  // Handle approve all
  const approveAll = () => {
    setDetailUsulan(
      detailUsulan.map(item => ({
        ...item,
        jumlah_disetujui: item.jumlah_alat,
        status_item: "approved"
      }))
    );
  };

  // Handle reject all
  const rejectAll = () => {
    setDetailUsulan(
      detailUsulan.map(item => ({
        ...item,
        jumlah_disetujui: 0,
        status_item: "rejected"
      }))
    );
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string | undefined | null) => {
    // Adopted from laporan-pengajuan for consistency
    switch (status) {
      case "Disetujui Sepenuhnya":
        return "bg-green-100 text-green-700 dark:bg-green-700/40 dark:text-green-300 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/30";
      case "Disetujui Sebagian":
        return "bg-sky-100 text-sky-700 dark:bg-sky-700/40 dark:text-sky-300 ring-1 ring-inset ring-sky-600/20 dark:ring-sky-500/30";
      case "Ditolak":
        return "bg-red-100 text-red-700 dark:bg-red-700/40 dark:text-red-300 ring-1 ring-inset ring-red-600/20 dark:ring-red-500/30";
      default: // For "Belum Diverifikasi" or null
        return "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300 ring-1 ring-inset ring-slate-600/20 dark:ring-slate-500/30";
    }
  };

  // Filter pengajuan list based on status
  const filteredPengajuan = pengajuanList.filter(item => {
    const statusMatch = statusFilter === "all" ||
      (statusFilter === "null" && (
        item.status_verifikasi_kabid === null ||
        item.status_verifikasi_kabid === undefined ||
        item.status_verifikasi_kabid === "Menunggu Persetujuan" // Assuming this might be a default state
      )) ||
      item.status_verifikasi_kabid === statusFilter;

    const kabupatenMatch = filterKabupatenKota === "all" || 
      item.kabupaten_kota === filterKabupatenKota ||
      (!item.kabupaten_kota && filterKabupatenKota === "Kab/Kota Tidak Ditemukan"); // Handle case where kabupaten_kota might be "Kab/Kota Tidak Ditemukan"

    return statusMatch && kabupatenMatch;
  });

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


  return (
    // Applied main background gradient and layout from dashboard page
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-900 dark:to-cyan-950 text-slate-700 dark:text-slate-200">
      {/* Header - Consistent with dashboard */}
      <header className="bg-white/70 dark:bg-sky-950/70 backdrop-blur-md py-4 shadow-md sticky top-0 z-40 border-b border-sky-300/70 dark:border-sky-800/70">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-xl md:text-2xl font-semibold flex items-center text-sky-700 dark:text-sky-300">
            <Ship className="mr-2.5 h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            Verifikasi Pengajuan Bantuan
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6 md:py-8 px-4 md:px-6 flex-1 space-y-6 md:space-y-8">
        {/* Page Title is now in the header */}

        {/* Main Card for Daftar Pengajuan - Styling consistent with dashboard content cards */}
        <Card className="w-full bg-white dark:bg-sky-900 shadow-xl border border-sky-200 dark:border-sky-700">
          <CardHeader className="border-b border-slate-200 dark:border-sky-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-lg md:text-xl text-sky-700 dark:text-sky-300 shrink-0">Daftar Pengajuan</CardTitle> {/* Adjusted title size slightly */}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="w-full sm:w-auto sm:min-w-[200px]">
                  <label htmlFor="kabupatenFilter" className="sr-only">Filter Kabupaten/Kota:</label>
                  <Select value={filterKabupatenKota} onValueChange={setFilterKabupatenKota}>
                    <SelectTrigger id="kabupatenFilter" className="w-full bg-sky-50 dark:bg-sky-800/60 border-slate-300 dark:border-slate-600 focus:ring-sky-500">
                      <SelectValue placeholder="Filter Kabupaten/Kota..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kabupaten/Kota</SelectItem>
                      {DAFTAR_KABUPATEN_KOTA.map(kabKota => (
                        <SelectItem key={kabKota} value={kabKota}>
                          {kabKota}
                        </SelectItem>
                      ))}
                       <SelectItem value="Kab/Kota Tidak Ditemukan">Kab/Kota Tidak Ditemukan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-auto sm:min-w-[200px]">
                  <label htmlFor="statusFilter" className="sr-only">Filter Status:</label>
                  <select
                    id="statusFilter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-sky-50 dark:bg-sky-800/60 rounded-md text-sm text-slate-700 dark:text-slate-200 focus:ring-sky-500 focus:border-sky-500"
                  >
                    <option value="all">Semua Status</option>
                    <option value="Disetujui Sepenuhnya">Disetujui Sepenuhnya</option>
                    <option value="Disetujui Sebagian">Disetujui Sebagian</option>
                    <option value="Ditolak">Ditolak</option>
                    <option value="null">Belum Diverifikasi</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-sky-500 dark:text-sky-400" />
              </div>
            ) : filteredPengajuan.length === 0 ? (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                <Inbox size={48} className="mx-auto mb-4 text-sky-400" />
                <p className="text-lg">Tidak ada data pengajuan yang sesuai.</p>
                {statusFilter !== "all" && <p className="text-sm">Coba pilih "Semua Status" atau filter lain.</p>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-sky-100 dark:bg-sky-700/50">
                    <TableRow>
                      <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">No</TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Nama KUB</TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Wilayah</TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Tgl. Pengajuan</TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Waktu</TableHead><TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase text-center">Status Kabid</TableHead>
                      <TableHead className="w-[50px] px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredPengajuan.map((item, index) => (
                      <React.Fragment key={item.id_pengajuan}>
                        <TableRow className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${expandedRowId === item.id_pengajuan ? 'bg-sky-50 dark:bg-sky-700/20' : ''}`}
                        >
                          <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200">{index + 1}</TableCell>
                          <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200 font-medium">{item.nama_kub}</TableCell>
                          <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200">{item.wilayah_penangkapan === 'perairan_umum_daratan' ? 'Perairan Daratan' : 'Laut'}</TableCell>
                          <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200">{new Date(item.tanggal_pengajuan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                          <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200">{new Date(item.tanggal_pengajuan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</TableCell><TableCell className="px-3 py-3 text-center">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusBadgeColor(item.status_verifikasi_kabid)}`}>
                              {item.status_verifikasi_kabid || 'Belum Diverifikasi'}
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
                        {expandedRowId === item.id_pengajuan && selectedPengajuan && (
                          <TableRow className="bg-white dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-800">
                            <TableCell colSpan={7} className="p-0">
                              <div className="p-4 md:p-6 border-t-2 border-sky-300 dark:border-sky-600 bg-sky-50/30 dark:bg-sky-800/10">
                              {isDetailLoading ? (
                                <div className="flex justify-center items-center py-10">
                                  <Loader2 className="h-8 w-8 animate-spin text-sky-500 dark:text-sky-400" />
                                  <p className="ml-2 text-slate-600 dark:text-slate-300">Memuat detail...</p>
                                </div>
                              ) : (
                                <div className="space-y-6">
                                  {/* Informasi Umum Section */}
                                  <div className="p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-sky-50/50 dark:bg-sky-800/20">
                                    <h3 className="text-lg font-semibold mb-3 text-sky-700 dark:text-sky-300 flex items-center">
                                      <FileText size={20} className="mr-2" /> Informasi Pengajuan: {selectedPengajuan.nama_kub}
                                      <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium ${getStatusBadgeColor(selectedPengajuan.status_verifikasi_kabid)}`}>
                                        {selectedPengajuan.status_verifikasi_kabid || 'Belum Diverifikasi'}
                                      </span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                      <div className="flex items-center">
                                        <Users size={16} className="mr-2 text-sky-600 dark:text-sky-400" />
                                        <strong className="text-slate-600 dark:text-slate-300 w-32">Nama KUB:</strong>
                                        <span className="text-slate-800 dark:text-slate-100">{selectedPengajuan.nama_kub}</span>
                                      </div>
                                      <div className="flex items-center">
                                        <MapPin size={16} className="mr-2 text-sky-600 dark:text-sky-400" />
                                        <strong className="text-slate-600 dark:text-slate-300 w-32">Kab/Kota:</strong>
                                        <span className="text-slate-800 dark:text-slate-100">{selectedPengajuan.kabupaten_kota}</span>
                                      </div>
                                      <div className="flex items-center">
                                        <Anchor size={16} className="mr-2 text-sky-600 dark:text-sky-400" />
                                        <strong className="text-slate-600 dark:text-slate-300 w-32">Wilayah:</strong>
                                        <span className="text-slate-800 dark:text-slate-100">{selectedPengajuan.wilayah_penangkapan === 'perairan_umum_daratan' ? 'Perairan Daratan' : 'Laut'}</span>
                                      </div>
                                      <div className="flex items-center">
                                        <CalendarDays size={16} className="mr-2 text-sky-600 dark:text-sky-400" />
                                        <strong className="text-slate-600 dark:text-slate-300 w-32">Tgl. Pengajuan:</strong>
                                        <span className="text-slate-800 dark:text-slate-100">{new Date(selectedPengajuan.tanggal_pengajuan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                      </div>
                                      <div className="md:col-span-2 flex items-start">
                                        <MapPin size={16} className="mr-2 mt-0.5 text-sky-600 dark:text-sky-400" />
                                        <strong className="text-slate-600 dark:text-slate-300 w-32 shrink-0">Alamat KUB:</strong>
                                        <span className="text-slate-800 dark:text-slate-100">{selectedPengajuan.alamat_kub}</span>
                                      </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-sky-200 dark:border-sky-700/50">
                                      <button onClick={handlePreviewDocument} className="text-sm text-sky-600 dark:text-sky-400 hover:underline flex items-center">
                                        <FileText size={16} className="mr-1" /> Lihat Dokumen Pengajuan
                                      </button>
                                    </div>
                                  </div>

                                  {/* Detail Usulan Section */}
                                  <div className="p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-sky-50/50 dark:bg-sky-800/20">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                                      <h3 className="text-lg font-semibold text-sky-700 dark:text-sky-300 mb-2 sm:mb-0 flex items-center"><Ship size={20} className="mr-2" />Detail Usulan Alat Tangkap</h3>
                                      <div className="flex space-x-2">
                                        <Button onClick={approveAll} size="sm" className="bg-teal-500 hover:bg-teal-600 text-xs">Setujui Semua</Button>
                                        <Button onClick={rejectAll} size="sm" variant="destructive" className="bg-rose-500 hover:bg-rose-600 text-xs">Tolak Semua</Button>
                                      </div>
                                    </div>
                                    <div className="overflow-x-auto rounded-md border border-teal-200 dark:border-teal-600">
                                      <table className="min-w-full bg-white dark:bg-slate-800">
                                        <thead className="bg-sky-100 dark:bg-sky-700/50">
                      <tr>
                        <th className="py-2.5 px-4 text-left text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">Nama Alat</th>
                        <th className="py-2.5 px-4 text-left text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">Diajukan</th>
                        <th className="py-2.5 px-4 text-left text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">Disetujui</th>
                        <th className="py-2.5 px-4 text-left text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">Status Item</th>
                      </tr>
                    </thead>
                                        <tbody className="divide-y divide-sky-100 dark:divide-sky-700/50">
                      {detailUsulan.map((item) => (
                        <tr key={item.id_detail_usulan}>
                          <td className="py-2.5 px-4 text-sm text-slate-700 dark:text-slate-200">
                            {item.nama_alat}
                          </td>
                          <td className="py-2.5 px-4 text-sm text-slate-700 dark:text-slate-200">
                            {item.jumlah_alat}
                          </td>
                          <td className="py-2.5 px-4">
                            <input
                              type="number"
                              min="0"
                              max={item.jumlah_alat}
                              value={item.jumlah_disetujui || 0}
                              onChange={(e) => handleApprovedQuantityChange(
                                item.id_detail_usulan, 
                                parseInt(e.target.value) || 0
                              )}
                              className="w-20 border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded-md text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:ring-sky-500 focus:border-sky-500"
                              disabled={item.status_item === "rejected"}
                            />
                          </td>
                          <td className="py-2.5 px-4">
                            <select
                              value={item.status_item || "pending"}
                              onChange={(e) => handleItemStatusChange(
                                item.id_detail_usulan, 
                                e.target.value
                              )}
                              className="w-full border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded-md text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:ring-sky-500 focus:border-sky-500"                            >
                              <option value="pending">Menunggu</option>
                              <option value="approved">Disetujui</option>
                              <option value="rejected">Ditolak</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  {/* Anggota Kelompok Section */}
                                  <div className="p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-sky-50/50 dark:bg-sky-800/20">
                                    <h3 className="text-lg font-semibold text-sky-700 dark:text-sky-300 mb-3 flex items-center"><Users size={20} className="mr-2" />Anggota Kelompok</h3>
                                    <div className="overflow-x-auto rounded-md border border-sky-200 dark:border-sky-600">
                                      <table className="min-w-full bg-white dark:bg-slate-800">
                                        <thead className="bg-sky-100 dark:bg-sky-700/50">
                      <tr>
                        <th className="py-2.5 px-4 text-left text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">Nama</th>
                        <th className="py-2.5 px-4 text-left text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">Jabatan</th>
                        <th className="py-2.5 px-4 text-left text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">NIK</th>
                        <th className="py-2.5 px-4 text-left text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">No. Kusuka</th>
                      </tr>
                    </thead>
                                        <tbody className="divide-y divide-sky-100 dark:divide-sky-700/50">
                      {anggotaKelompok.map((anggota) => (
                        <tr key={anggota.id_anggota}>
                          <td className="py-2.5 px-4 text-sm text-slate-700 dark:text-slate-200">{anggota.nama_anggota}</td>
                          <td className="py-2.5 px-4 text-sm text-slate-700 dark:text-slate-200 capitalize">{anggota.jabatan}</td>
                          <td className="py-2.5 px-4 text-sm text-slate-700 dark:text-slate-200">{anggota.nik}</td>
                          <td className="py-2.5 px-4 text-sm text-slate-700 dark:text-slate-200">{anggota.no_kusuka}</td>
                        </tr>
                      ))}
                    </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  {/* Dokumen Checklist Section (Read-only) */}
                                  <div className="p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-sky-50/50 dark:bg-sky-800/20">
                                    <h3 className="text-lg font-semibold text-sky-700 dark:text-sky-300 mb-3 flex items-center"><ListChecks size={20} className="mr-2 text-green-500" />Kelengkapan Dokumen (Diverifikasi Admin)</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                      {renderChecklistItem("Proposal", dokumenChecklist.proposal)}
                                      {renderChecklistItem("Surat Usulan", dokumenChecklist.surat_usulan)}
                                      {renderChecklistItem("Foto KTP", dokumenChecklist.foto_ktp)}
                                      {renderChecklistItem("Surat KTM", dokumenChecklist.surat_ktm)}
                                      {renderChecklistItem("Foto Rumah", dokumenChecklist.foto_rumah)}
                                      {renderChecklistItem("Foto Alat Tangkap", dokumenChecklist.foto_alat_tangkap)}
                                      {renderChecklistItem("BPJS", dokumenChecklist.bpjs)}
                                      {renderChecklistItem("KIS", dokumenChecklist.kis)}
                                      {renderChecklistItem("Kartu Kusuka", dokumenChecklist.kartu_kusuka)}
                                      {renderChecklistItem("Foto Kapal", dokumenChecklist.foto_kapal)}
                                    </div>
                                  </div>

                                  {/* Catatan Verifikasi Section */}
                                  <div className="p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-sky-50/50 dark:bg-sky-800/20">
                                    <h3 className="text-lg font-semibold text-sky-700 dark:text-sky-300 mb-3 flex items-center"><MessageSquare size={20} className="mr-2" />Catatan Verifikasi Kepala Bidang</h3>
                                    <textarea
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      placeholder="Tambahkan catatan verifikasi (opsional)..."
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:ring-sky-500 focus:border-sky-500"
                      rows={4}
                                    ></textarea>
                                  </div>

                                  <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <Button
                                      onClick={saveVerificationDecision}
                                      disabled={isDetailLoading}
                                      className="px-6 py-2.5 bg-gradient-to-r from-sky-700 to-cyan-600 text-white font-semibold rounded-lg shadow-md hover:from-sky-800 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 dark:ring-offset-slate-800 transition-all"
                                    >
                                      {isDetailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                      Simpan Keputusan Verifikasi
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Document Preview Modal */}
      {showModal && dokumenUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-11/12 md:w-3/4 lg:w-2/3 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-lg text-sky-700 dark:text-sky-300">Dokumen Pengajuan</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setDokumenUrl(null);
                }}
                className="text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-300 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <iframe
                src={dokumenUrl}
                className="w-full h-full border-0 rounded"
                title="Document Preview"
              ></iframe>
            </div>
          </div>
        </div>
      )}
      </main>

    </div>
  );
}