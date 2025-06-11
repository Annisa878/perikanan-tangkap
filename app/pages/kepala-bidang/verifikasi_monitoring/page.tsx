"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ChevronDown, ChevronUp, FileText, Ship, Users, MessageSquare, Inbox, CalendarDays, MapPin, Anchor, Droplets } from 'lucide-react'; // Added icons

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

const VERIFICATION_STATUSES = {
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  PENDING: 'Menunggu', // Menunggu Verifikasi akan menjadi default jika status_verifikasi_kabid null
}; // Hapus REVISION

// Daftar Domisili (menggunakan daftar kabupaten/kota yang umum)
const DAFTAR_DOMISILI = [
  "Kab. Banyuasin", "Kab. Empat Lawang", "Kab. Muara Enim", "Kab. Musi Banyuasin", "Kab. Musi Rawas",
  "Kab. Musi Rawas Utara", "Kab. Ogan Ilir", "Kab. Ogan Komering Ilir", "Kab. Ogan Komering Ulu",
  "Kab. Ogan Komering Ulu Selatan", "Kab. Ogan Komering Ulu Timur", "Kab. Penukal Abab Lematang Ilir",
  "Kota Lubuk Linggau", "Kota Palembang", "Kota Pagaralam", "Kota Prabumulih"
].sort();

export default function VerifikasiMonitoringPage() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [monitoringList, setMonitoringList] = useState<MonitoringData[]>([]);
  const [selectedMonitoring, setSelectedMonitoring] = useState<MonitoringData | null>(null);
  const [catatanKabid, setCatatanKabid] = useState('');
  const [statusVerifikasiKabid, setStatusVerifikasiKabid] = useState<string>(VERIFICATION_STATUSES.PENDING);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDomisili, setFilterDomisili] = useState<string>('all'); // State for Domisili filter
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false); // For save button loading state

  const fetchMonitoringData = useCallback(async () => {
    setIsLoading(true);
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching monitoring data:', error);
      window.alert('Gagal memuat data monitoring.');
      setMonitoringList([]);
    } else {
      setMonitoringList(data || []);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchMonitoringData();
  }, [fetchMonitoringData]);

  const toggleExpandRow = (monitoring: MonitoringData) => {
    if (expandedRowId === monitoring.id) {
      setExpandedRowId(null);
      setSelectedMonitoring(null);
      setCatatanKabid('');
      setStatusVerifikasiKabid(VERIFICATION_STATUSES.PENDING);
      return;
    }

    setSelectedMonitoring(monitoring);
    setExpandedRowId(monitoring.id);
    setCatatanKabid(monitoring.catatan_verifikasi_kabid || ''); // Changed to read from catatan_verifikasi_kabid

    const currentStatusFromDB = monitoring.status_verifikasi_kabid;
    const validSelectableStatuses = Object.values(VERIFICATION_STATUSES);

    // Ensure the status for the Select component is one of the valid options
    setStatusVerifikasiKabid(currentStatusFromDB && validSelectableStatuses.includes(currentStatusFromDB) ? currentStatusFromDB : VERIFICATION_STATUSES.PENDING);
  };
  const saveVerificationDecision = async () => {
    if (!selectedMonitoring) return;
    setIsDetailLoading(true); // Use separate loading state for save action

    try {
      const { error } = await supabase
        .from('monitoring')
        .update({
          status_verifikasi_kabid: statusVerifikasiKabid,
          catatan_verifikasi_kabid: catatanKabid,
        })
        .eq('id', selectedMonitoring.id);

      if (error) {
        console.error('Error saving verification:', error);
        window.alert('Data gagal disimpan.');
      } else {
        window.alert('Data berhasil disimpan.');
        // Update local list state for immediate feedback in the list on the left
        const updatedList = monitoringList.map(item =>
          item.id === selectedMonitoring!.id // selectedMonitoring is checked at the start
            ? { ...item, status_verifikasi_kabid: statusVerifikasiKabid, catatan_verifikasi_kabid: catatanKabid }
            : item
        );
        setMonitoringList(updatedList);
      }
    } catch (e: any) {
        console.error("Unexpected error during saveVerificationDecision:", e);
        window.alert('Terjadi kesalahan tak terduga saat menyimpan data.');
    } finally {
      setSelectedMonitoring(null);
      setCatatanKabid('');
      setStatusVerifikasiKabid(VERIFICATION_STATUSES.PENDING);
      setExpandedRowId(null); // Collapse the row
      setIsDetailLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string | null | undefined): string => {
    // Adopted from verifikasi_pengajuan for consistency
    switch (status) {
      case VERIFICATION_STATUSES.APPROVED:
        return "bg-green-100 text-green-700 dark:bg-green-700/40 dark:text-green-300 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/30";
      case VERIFICATION_STATUSES.REJECTED:
        return "bg-red-100 text-red-700 dark:bg-red-700/40 dark:text-red-300 ring-1 ring-inset ring-red-600/20 dark:ring-red-500/30";
      case VERIFICATION_STATUSES.PENDING:
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300 ring-1 ring-inset ring-slate-600/20 dark:ring-slate-500/30";
    }
  };
  const formatNumber = (num: number | null | undefined) => num?.toLocaleString('id-ID') || '0';

  const filteredMonitoringList = monitoringList.filter(item => {
    const statusMatch = filterStatus === 'all' || (item.status_verifikasi_kabid || VERIFICATION_STATUSES.PENDING) === filterStatus;
    const domisiliMatch = filterDomisili === 'all' || item.domisili === filterDomisili;

    return statusMatch && domisiliMatch;
  });

  return (
    // Applied main background gradient and layout from verifikasi_pengajuan page
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-900 dark:to-cyan-950 text-slate-700 dark:text-slate-200">
      {/* Header - Consistent with verifikasi_pengajuan */}
      <header className="bg-white/70 dark:bg-sky-950/70 backdrop-blur-md py-4 shadow-md sticky top-0 z-40 border-b border-sky-300/70 dark:border-sky-800/70">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-xl md:text-2xl font-semibold flex items-center text-sky-700 dark:text-sky-300">
            <Ship className="mr-2.5 h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            Verifikasi Data Monitoring
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6 md:py-8 px-4 md:px-6 flex-1 space-y-6 md:space-y-8">

        {/* Main Card for Daftar Monitoring - Styling consistent with verifikasi_pengajuan content cards */}
        <Card className="w-full bg-white dark:bg-sky-900 shadow-xl border border-sky-200 dark:border-sky-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-lg md:text-xl text-sky-700 dark:text-sky-300 shrink-0">Daftar Monitoring</CardTitle> {/* Adjusted title size slightly */}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="w-full sm:w-auto sm:min-w-[200px]">
                  <label htmlFor="domisiliFilter" className="sr-only">Filter Domisili:</label>
                  <Select value={filterDomisili} onValueChange={setFilterDomisili}>
                    <SelectTrigger id="domisiliFilter" className="w-full bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500">
                      <SelectValue placeholder="Filter berdasarkan domisili..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Domisili</SelectItem>
                      {DAFTAR_DOMISILI.map(domisili => (
                        <SelectItem key={domisili} value={domisili}>{domisili}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-auto sm:min-w-[200px]">
                  <label htmlFor="statusFilter" className="sr-only">Filter Status:</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger id="statusFilter" className="w-full bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500">
                      <SelectValue placeholder="Filter berdasarkan status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      {Object.values(VERIFICATION_STATUSES).map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                <p className="text-lg">Tidak ada data monitoring yang sesuai.</p>
                {(filterStatus !== "all" || filterDomisili !== "all") && <p className="text-sm">Coba ubah pilihan filter Anda.</p>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-sky-100 dark:bg-sky-700/50">
                    <TableRow>
                      <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">No</TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Nama Anggota</TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">KUB</TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Domisili</TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Periode</TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase text-center">Status Kabid</TableHead>
                      <TableHead className="w-[50px] px-3 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredMonitoringList.map((monitoring, index) => (
                      <React.Fragment key={monitoring.id}                      >
                        <TableRow className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${expandedRowId === monitoring.id ? 'bg-sky-50 dark:bg-sky-700/20' : ''}`}>
                          <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200">{index + 1}</TableCell>
                          <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200 font-medium">{monitoring.nama_anggota}</TableCell>
                          <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200">{monitoring.kub}</TableCell>
                          <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200">{monitoring.domisili}</TableCell>
                          <TableCell className="px-3 py-3 text-sm text-slate-700 dark:text-slate-200">{monitoring.bulan} {monitoring.tahun}</TableCell>
                          <TableCell className="px-3 py-3 text-center">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusBadgeColor(monitoring.status_verifikasi_kabid || VERIFICATION_STATUSES.PENDING)}`}>
                              {monitoring.status_verifikasi_kabid || VERIFICATION_STATUSES.PENDING}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm" // Changed from "icon" to "sm" to allow text
                              onClick={() => toggleExpandRow(monitoring)}
                              className="h-8 px-2 text-xs" // Adjusted padding
                            >
                              <span className="flex items-center">
                                Detail {expandedRowId === monitoring.id ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                              </span>
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedRowId === monitoring.id && selectedMonitoring && (
                          <TableRow className="bg-white dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-800">
                            <TableCell colSpan={7} className="p-0">
                              <div className="p-4 md:p-6 border-t-2 border-sky-300 dark:border-sky-600 bg-sky-50/30 dark:bg-sky-800/10">
                                <div className="space-y-6">
                                  {/* Informasi Umum Section */}
                                  <div className="p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-sky-50/50 dark:bg-sky-800/20">
                                    <h3 className="text-lg font-semibold mb-3 text-sky-700 dark:text-sky-300 flex items-center">
                                      <FileText size={20} className="mr-2" /> Informasi Umum: {selectedMonitoring.nama_anggota}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                      <div className="flex items-center"><Users size={16} className="mr-2 text-sky-600 dark:text-sky-400" /><strong className="text-slate-600 dark:text-slate-300 w-32">KUB:</strong><span className="text-slate-800 dark:text-slate-100">{selectedMonitoring.kub}</span></div>
                                      <div className="flex items-center"><MapPin size={16} className="mr-2 text-sky-600 dark:text-sky-400" /><strong className="text-slate-600 dark:text-slate-300 w-32">Domisili:</strong><span className="text-slate-800 dark:text-slate-100">{selectedMonitoring.domisili}</span></div>
                                      <div className="flex items-center"><CalendarDays size={16} className="mr-2 text-sky-600 dark:text-sky-400" /><strong className="text-slate-600 dark:text-slate-300 w-32">Periode:</strong><span className="text-slate-800 dark:text-slate-100">{selectedMonitoring.bulan} {selectedMonitoring.tahun}</span></div>
                                      <div className="flex items-center"><Ship size={16} className="mr-2 text-sky-600 dark:text-sky-400" /><strong className="text-slate-600 dark:text-slate-300 w-32">Trip ke-:</strong><span className="text-slate-800 dark:text-slate-100">{selectedMonitoring.trip}</span></div>
                                      <div className="flex items-center"><Droplets size={16} className="mr-2 text-sky-600 dark:text-sky-400" /><strong className="text-slate-600 dark:text-slate-300 w-32">Jenis BBM:</strong><span className="text-slate-800 dark:text-slate-100">{selectedMonitoring.jenis_bbm}</span></div>
                                      <div className="flex items-center"><Droplets size={16} className="mr-2 text-sky-600 dark:text-sky-400" /><strong className="text-slate-600 dark:text-slate-300 w-32">Jumlah BBM:</strong><span className="text-slate-800 dark:text-slate-100">{selectedMonitoring.jumlah_bbm_liter} Liter</span></div>
                                      <div className="flex items-center md:col-span-2"><Anchor size={16} className="mr-2 text-sky-600 dark:text-sky-400" /><strong className="text-slate-600 dark:text-slate-300 w-32 shrink-0">Daerah Penangkapan:</strong><span className="text-slate-800 dark:text-slate-100">{selectedMonitoring.daerah_penangkapan}</span></div>
                                    </div>
                                  </div>

                                  {/* Detail Hasil Produksi Section */}
                                  <div className="p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-sky-50/50 dark:bg-sky-800/20">
                                    <h3 className="text-lg font-semibold text-sky-700 dark:text-sky-300 mb-3 flex items-center"><Ship size={20} className="mr-2" />Detail Hasil Produksi</h3>
                                    <div className="overflow-x-auto rounded-md border border-sky-200 dark:border-sky-600">
                                      <Table className="min-w-full bg-white dark:bg-slate-800"> {/* Table inside expanded row */}
                                        <TableHeader className="bg-sky-100 dark:bg-sky-700/50"> {/* Consistent header for inner table */}
                                          <TableRow>
                                            <TableHead className="py-2.5 px-4 text-left text-xs font-medium text-sky-700 dark:text-sky-200 uppercase tracking-wider">Nama Ikan</TableHead>
                                            <TableHead className="py-2.5 px-4 text-right text-xs font-medium text-sky-700 dark:text-sky-200 uppercase tracking-wider">Jumlah (Kg)</TableHead>
                                            <TableHead className="py-2.5 px-4 text-right text-xs font-medium text-sky-700 dark:text-sky-200 uppercase tracking-wider">Harga/Kg (Rp)</TableHead>
                                            <TableHead className="py-2.5 px-4 text-right text-xs font-medium text-sky-700 dark:text-sky-200 uppercase tracking-wider">Total Harga (Rp)</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody className="divide-y divide-sky-100 dark:divide-sky-700/50">
                                          {selectedMonitoring.detail_produksi && selectedMonitoring.detail_produksi.length > 0 ? (
                                            selectedMonitoring.detail_produksi.map(detail => (
                                              <TableRow key={detail.id}>
                                                <TableCell className="py-2.5 px-4 text-sm text-slate-700 dark:text-slate-200">{detail.nama_ikan}</TableCell>
                                                <TableCell className="py-2.5 px-4 text-sm text-slate-700 dark:text-slate-200 text-right">{formatNumber(detail.jumlah_kg)}</TableCell>
                                                <TableCell className="py-2.5 px-4 text-sm text-slate-700 dark:text-slate-200 text-right">{formatNumber(detail.harga_per_kg)}</TableCell>
                                                <TableCell className="py-2.5 px-4 text-sm text-slate-700 dark:text-slate-200 text-right">{formatNumber(detail.total_harga)}</TableCell>
                                              </TableRow>
                                            ))
                                          ) : (
                                            <TableRow><TableCell colSpan={4} className="py-4 px-4 text-center text-slate-500 dark:text-slate-400">Tidak ada detail produksi.</TableCell></TableRow>
                                          )}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>

                                  {/* Keputusan Verifikasi Section */}
                                  <div className="p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-sky-50/50 dark:bg-sky-800/20">
                                    <h3 className="text-lg font-semibold text-sky-700 dark:text-sky-300 mb-3 flex items-center"><MessageSquare size={20} className="mr-2" />Keputusan Verifikasi</h3>
                                    <div className="space-y-4">
                                      <div>
                                        <label htmlFor="statusVerifikasi" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status Verifikasi</label>
                                        <Select value={statusVerifikasiKabid} onValueChange={setStatusVerifikasiKabid}>
                                          <SelectTrigger id="statusVerifikasi" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md text-sm text-slate-700 dark:text-slate-200 focus:ring-indigo-500 focus:border-indigo-500">
                                            <SelectValue placeholder="Pilih status..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {Object.values(VERIFICATION_STATUSES).map(status => (
                                              <SelectItem key={status} value={status}>{status}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <label htmlFor="catatanKabid" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Catatan Kepala Bidang</label>
                                        <Textarea
                                          id="catatanKabid"
                                          value={catatanKabid}
                                          onChange={(e) => setCatatanKabid(e.target.value)}
                                          placeholder="Tambahkan catatan verifikasi (opsional)..."
                                          rows={4}
                                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <Button onClick={saveVerificationDecision} disabled={isDetailLoading} className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-cyan-500 text-white font-semibold rounded-lg shadow-md hover:from-sky-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 dark:ring-offset-slate-800 transition-all">
                                      {isDetailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                      Simpan Keputusan Verifikasi
                                    </Button>
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

    </div>
  );
}