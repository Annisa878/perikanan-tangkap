"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Removed CardDescription as it's not used in the new theme
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge'; // Tetap digunakan untuk status
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Menambahkan ikon
import { Loader2, CalendarDays, MapPin, User, Users, Anchor, Droplets, Ship, FileText, ChevronDown, ChevronUp, Inbox, MessageSquare } from 'lucide-react'; // Menambahkan ikon, MessageSquare

interface DetailProduksi {
  id: string;
  nama_ikan: string;
  jumlah_kg: number;
  harga_per_kg: number;
  total_harga: number;
}

interface MonitoringData {
  id: string;
  nama_anggota: string;
  kub: string;
  trip: number;
  jenis_bbm: string;
  jumlah_bbm_liter: number;
  daerah_penangkapan: string;
  domisili: string;
  bulan: string;
  tahun: number;
  created_at: string;
  detail_produksi: DetailProduksi[];
  status_verifikasi_kabid?: string | null;
  catatan_verifikasi_kabid?: string | null; // Changed from catatan_kabid
}

// Definisikan status yang dianggap "Disetujui" oleh Kepala Bidang
const KABID_APPROVED_STATUS = 'Disetujui'; // Sesuaikan jika nilai di DB berbeda, misal 'Disetujui Sepenuhnya'
// Jika Anda menggunakan VERIFICATION_STATUSES dari halaman kepala-bidang, pastikan nilainya konsisten.
// Contoh: const KABID_APPROVED_STATUS = VERIFICATION_STATUSES.APPROVED; (jika VERIFICATION_STATUSES diimpor atau didefinisikan di sini)

export default function LaporanAkhirKepalaDinasPage() { // Mengganti nama komponen agar sesuai dengan file
  // Daftar 17 Kabupaten/Kota berdasarkan input
  const DAFTAR_KABUPATEN_KOTA = [
    "Kab. Banyuasin",
    "Kab. Empat Lawang",
    "Kab. Muara Enim",
    "Kab. Musi Banyuasin",
    "Kab. Musi Rawas",
    "Kab. Musi Rawas Utara",
    "Kab. Ogan Ilir",
    "Kab. Ogan Komering Ilir",
    "Kab. Ogan Komering Ulu",
    "Kab. Ogan Komering Ulu Selatan",
    "Kab. Ogan Komering Ulu Timur",
    "Kab. Penukal Abab Lematang Ilir",
    "Kab. Lahat", // Sebelumnya "Kota Lahat", dikoreksi menjadi Kabupaten
    "Kota Lubuk Linggau",
    "Kota Palembang",
    "Kota Pagar Alam",
    "Kota Prabumulih"
  ].sort(); // Urutkan untuk tampilan yang konsisten

  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [monitoringList, setMonitoringList] = useState<MonitoringData[]>([]);
  const [filterDomisili, setFilterDomisili] = useState<string>("all"); // State untuk filter domisili
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null); // State untuk expand/collapse detail
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchMonitoringData = useCallback(async () => {
    setIsLoading(true); // Pastikan isLoading di-set di awal
    const { data, error } = await supabase
      .from('monitoring')
      .select(`
        *,
        detail_produksi (
          id,
          nama_ikan,
          jumlah_kg,
          harga_per_kg,
          total_harga
        )
      `)
      .eq('status_verifikasi_kabid', KABID_APPROVED_STATUS) // Filter data yang sudah disetujui Kabid
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching monitoring data:', error);
      setAlertMessage({ type: 'error', message: 'Gagal memuat data monitoring.' });
      setMonitoringList([]);
    } else if (data) { // Pastikan data tidak null sebelum di-set
      setMonitoringList(data || []);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchMonitoringData();
  }, [fetchMonitoringData]); // fetchMonitoringData sudah di-memoize dengan useCallback

  const toggleExpandRow = (monitoringId: string) => {
    setExpandedRowId(prevId => (prevId === monitoringId ? null : monitoringId));
  };

  // Adopted getStatusBadgeColor from laporan-pengajuan for consistent badge styling
  const getStatusBadgeColor = (status: string | null | undefined) => {
    switch (status) {
      // KABID_APPROVED_STATUS is 'Disetujui'. We'll map it to a green style.
      case 'Disetujui': // Explicitly handle the status used on this page
      case "Disetujui Sepenuhnya":
        return "bg-green-100 text-green-700 dark:bg-green-700/40 dark:text-green-300 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/30";
      case "Disetujui Sebagian":
        return "bg-sky-100 text-sky-700 dark:bg-sky-700/40 dark:text-sky-300 ring-1 ring-inset ring-sky-600/20 dark:ring-sky-500/30";
      case "Ditolak": 
        return "bg-red-100 text-red-700 dark:bg-red-700/40 dark:text-red-300 ring-1 ring-inset ring-red-600/20 dark:ring-red-500/30";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300 ring-1 ring-inset ring-slate-600/20 dark:ring-slate-500/30";
    }
  };

  // Filter data untuk tabel berdasarkan domisili yang dipilih
  const filteredMonitoringList = React.useMemo(() => {
    if (filterDomisili === "all") {
      return monitoringList;
    }
    return monitoringList.filter(monitoring => monitoring.domisili === filterDomisili);
  }, [monitoringList, filterDomisili]);

  const formatNumber = (num: number | null | undefined) => num?.toLocaleString('id-ID') || '0';
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-900 dark:to-cyan-950 text-slate-700 dark:text-slate-200">
      {/* Header - Consistent with other Kepala Dinas pages */}
      <header className="bg-white/70 dark:bg-sky-950/70 backdrop-blur-md py-4 shadow-md sticky top-0 z-40 border-b border-sky-300/70 dark:border-sky-800/70">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-xl md:text-2xl font-semibold flex items-center text-sky-700 dark:text-sky-300">
            <Ship className="mr-2.5 h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            Laporan Akhir Data Monitoring
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6 md:py-8 px-4 md:px-6 flex-1 space-y-6 md:space-y-8">

      {alertMessage && (
        <Alert 
          variant={alertMessage.type === 'error' ? 'destructive' : 'default'} // 'default' variant usually has good contrast
          className="mb-4"
        >
          <AlertTitle>{alertMessage.type === 'success' ? 'Berhasil' : 'Gagal'}</AlertTitle>
          <AlertDescription>{alertMessage.message}</AlertDescription>
        </Alert>
      )}

        {/* Updated Card styling to match kepala-dinas/laporan-pengajuan and dashboard content blocks */}
        <Card className="w-full bg-blue-50 dark:bg-slate-800 shadow-lg rounded-xl">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700"> {/* Adjusted dark border */}
          {/* CardTitle removed as main H1 is added. Filter aligned to the right. */}
          <div className="flex flex-col sm:flex-row sm:justify-end items-start sm:items-center gap-4">
            {/* Filter Domisili */}
            <div className="w-full sm:w-auto sm:min-w-[250px]">
              <Select value={filterDomisili} onValueChange={setFilterDomisili}>
                <SelectTrigger className="w-full bg-slate-50 dark:bg-sky-800/60 border-slate-300 dark:border-slate-600 focus:ring-sky-500">
                  <SelectValue placeholder="Filter Domisili..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Domisili</SelectItem>
                  {DAFTAR_KABUPATEN_KOTA.map(domisili => (
                    <SelectItem key={domisili} value={domisili}>
                      {domisili}
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
          ) : filteredMonitoringList.length === 0 ? (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
              <Inbox size={48} className="mx-auto mb-4 text-sky-400" />
              <p className="text-lg">Tidak ada data monitoring yang disetujui.</p>
              {filterDomisili !== "all" && <p className="text-sm">Coba pilih "Semua Domisili" atau filter lain.</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-sky-100 dark:bg-sky-700/50">
                  <TableRow>
                    <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">No</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Nama Ketua</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Nama KUB</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Domisili</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Periode</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase text-center">Status Kabid</TableHead>
                    <TableHead className="w-[80px] px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredMonitoringList.map((monitoring, index) => (
                    <React.Fragment key={monitoring.id}>
                      <TableRow 
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${expandedRowId === monitoring.id ? 'bg-sky-50 dark:bg-sky-700/20' : ''}`}
                      ><TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200">
                          {index + 1}</TableCell>
                        <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200 font-medium">{monitoring.nama_anggota}</TableCell>
                        <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200">{monitoring.kub}</TableCell>
                        <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200">{monitoring.domisili}</TableCell>
                        <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200">{monitoring.bulan} {monitoring.tahun}</TableCell>
                        <TableCell className="px-3 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadgeColor(monitoring.status_verifikasi_kabid)}`}>
                            {monitoring.status_verifikasi_kabid}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm" // Changed from "icon" to "sm" to allow text
                            onClick={() => toggleExpandRow(monitoring.id)}
                            className="h-8 px-2 text-xs" // Adjusted padding
                          >
                            <span className="flex items-center">
                              Detail {expandedRowId === monitoring.id ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                            </span>
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedRowId === monitoring.id && (
                        <TableRow className="bg-white dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-800">
                          <TableCell colSpan={7} className="p-0">
                            <div className="p-4 md:p-6 border-t-2 border-sky-300 dark:border-sky-600 bg-sky-50/30 dark:bg-sky-800/10"> {/* Matched expanded row container style */}
                              <div className="space-y-6"> {/* Added space-y-6 for consistency */}
                                <div className="p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-sky-50/50 dark:bg-sky-800/20"> {/* Matched section style */}
                                <h3 className="text-lg font-semibold mb-3 text-sky-700 dark:text-sky-300 flex items-center">
                                  <FileText size={20} className="mr-2" /> Informasi Umum
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                  <div className="flex items-center">
                                    <User size={16} className="mr-2 text-sky-600 dark:text-sky-400" />
                                    <strong className="text-slate-600 dark:text-slate-300 w-32">Nama Anggota:</strong>
                                    <span className="text-slate-800 dark:text-slate-100">{monitoring.nama_anggota}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Users size={16} className="mr-2 text-sky-600 dark:text-sky-400" />
                                    <strong className="text-slate-600 dark:text-slate-300 w-32">KUB:</strong>
                                    <span className="text-slate-800 dark:text-slate-100">{monitoring.kub || '-'}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <MapPin size={16} className="mr-2 text-sky-600 dark:text-sky-400" />
                                    <strong className="text-slate-600 dark:text-slate-300 w-32">Domisili:</strong>
                                    <span className="text-slate-800 dark:text-slate-100">{monitoring.domisili || '-'}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <CalendarDays size={16} className="mr-2 text-sky-600 dark:text-sky-400" />
                                    <strong className="text-slate-600 dark:text-slate-300 w-32">Periode:</strong>
                                    <span className="text-slate-800 dark:text-slate-100">{monitoring.bulan || '-'} {monitoring.tahun || '-'}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Ship size={16} className="mr-2 text-sky-600 dark:text-sky-400" />
                                    <strong className="text-slate-600 dark:text-slate-300 w-32">Trip ke-:</strong>
                                    <span className="text-slate-800 dark:text-slate-100">{monitoring.trip || '-'}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Droplets size={16} className="mr-2 text-sky-600 dark:text-sky-400" />
                                    <strong className="text-slate-600 dark:text-slate-300 w-32">Jenis BBM:</strong>
                                    <span className="text-slate-800 dark:text-slate-100">{monitoring.jenis_bbm || '-'}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Droplets size={16} className="mr-2 text-sky-600 dark:text-sky-400" />
                                    <strong className="text-slate-600 dark:text-slate-300 w-32">Jumlah BBM:</strong>
                                    <span className="text-slate-800 dark:text-slate-100">{formatNumber(monitoring.jumlah_bbm_liter)} Liter</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Anchor size={16} className="mr-2 text-sky-600 dark:text-sky-400" />
                                    <strong className="text-slate-600 dark:text-slate-300 w-32">Daerah Penangkapan:</strong>
                                    <span className="text-slate-800 dark:text-slate-100">{monitoring.daerah_penangkapan || '-'}</span>
                                  </div>
                                </div>
                              </div>
                
                                <div className="p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-sky-50/50 dark:bg-sky-800/20"> {/* Matched section style */}
                                  <h3 className="text-lg font-semibold mb-3 text-sky-700 dark:text-sky-300 flex items-center">
                                      <Ship size={20} className="mr-2" /> Detail Hasil Produksi
                                  </h3>
                                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                    <Table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                      <TableHeader className="bg-sky-100 dark:bg-sky-700/50">
                                        <TableRow>
                                          <TableHead className="px-4 py-3 text-left text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">Nama Ikan</TableHead>
                                          <TableHead className="px-4 py-3 text-right text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">Jumlah (Kg)</TableHead>
                                          <TableHead className="px-4 py-3 text-right text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">Harga/Kg</TableHead>
                                          <TableHead className="px-4 py-3 text-right text-xs font-medium text-sky-600 dark:text-sky-300 uppercase tracking-wider">Total Harga</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                        {monitoring.detail_produksi && monitoring.detail_produksi.length > 0 ? (
                                          monitoring.detail_produksi.map((detail: DetailProduksi) => (
                                            <TableRow key={detail.id} className="hover:bg-sky-50 dark:hover:bg-sky-700/20">
                                                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200">{detail.nama_ikan}</TableCell>
                                                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-right text-slate-700 dark:text-slate-200">{formatNumber(detail.jumlah_kg)}</TableCell>
                                                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-right text-slate-700 dark:text-slate-200">{formatCurrency(detail.harga_per_kg)}</TableCell>
                                                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-right text-slate-700 dark:text-slate-200">{formatCurrency(detail.total_harga)}</TableCell>
                                            </TableRow>
                                          ))
                                        ) : (
                                          <TableRow><TableCell colSpan={4} className="text-center py-4 text-slate-500 dark:text-slate-400">Tidak ada detail produksi.</TableCell></TableRow>
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                              </div>

                                <div className="p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-sky-50/50 dark:bg-sky-800/20"> {/* Matched section style */}
                                  <h3 className="text-lg font-semibold mb-2 text-sky-700 dark:text-sky-300 flex items-center">
                                    <MessageSquare size={20} className="mr-2" /> Catatan Kepala Bidang
                                  </h3>
                                  <div className="p-3 bg-sky-50 dark:bg-sky-800/30 rounded-lg border border-sky-200 dark:border-sky-700">
                                    <p className="text-sm text-slate-600 dark:text-slate-300 italic">
                                      {monitoring.catatan_verifikasi_kabid || "Tidak ada catatan dari Kepala Bidang."} 
                                    </p>
                                  </div>
                                </div>
                              </div>
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
      </main>

      {/* Footer - Consistent with dashboard */}
      <footer className="py-4 text-center text-sm text-slate-500 dark:text-slate-400 border-t border-sky-200 dark:border-sky-700">
      </footer>
    </div>    
  );
}