"use client";
import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Uncomment if using Shadcn Select
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    // DialogDescription, // Uncomment if needed
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Ship } from "lucide-react"; // Added Ship
import { Badge } from "@/components/ui/badge"; // Import Badge
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components
import { DOMISILI_LIST, Domisili, BULAN_LIST, Bulan } from "@/app/lib/enums"; // Import Domisili, BULAN_LIST, and Bulan type
import exportToExcel from "@/utils/exportToExcel";

// DetailProduksi interface remains the same
interface DetailProduksi {
    id: string;
    monitoring_id: string;
    nama_ikan: string;
    jumlah_kg: number;
    harga_per_kg: number;
    total_harga?: number;
    created_at: string;
}

// Updated Monitoring interface with enums
interface Monitoring {
    id: string;
    user_id: string;
    nama_anggota: string;
    kub: string;
    trip: number;
    jenis_bbm: string;
    jumlah_bbm_liter: number;
    daerah_penangkapan: string;
    keterangan: string;
    created_at: string;
    domisili: Domisili;
    bulan: Bulan;
    tahun: number;
    detail_produksi: DetailProduksi[];
    // Tambahkan properti untuk status verifikasi Kepala Bidang
    status_verifikasi_kabid?: string | null;
    catatan_verifikasi_kabid?: string | null;
}

// Constants for Kabid verification statuses (similar to VerifikasiMonitoringPage or LaporanAkhirKepalaDinasPage)
// Sesuaikan nilai string ini dengan yang ada di database Anda
const KABID_VERIFICATION_STATUSES = {
  APPROVED: 'Disetujui', // Atau 'Disetujui Sepenuhnya', dll.
  REJECTED: 'Ditolak',
  PENDING: 'Menunggu',
};




export default function AdminMonitoringPage() {
    const supabase = createClient();
    const [monitoringData, setMonitoringData] = useState<Monitoring[]>([]);
    const [expandedRows, setExpandedRows] = useState<{ [key: string]: boolean }>({});
    const [selectedMonitoring, setSelectedMonitoring] = useState<Monitoring | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    // List of available KUBs and years for filtering
    // const [kubList, setKubList] = useState<string[]>([]); // Tidak lagi dibutuhkan untuk input manual
    const [yearList, setYearList] = useState<number[]>([]);

    // Filters
    const [filterDomisili, setFilterDomisili] = useState<Domisili | ''>('');
    const [filterKUB, setFilterKUB] = useState<string>('');
    const [filterBulan, setFilterBulan] = useState<Bulan | ''>('');
    const [filterTahun, setFilterTahun] = useState<number | ''>('');
    const [filterStatusKabid, setFilterStatusKabid] = useState<string>(''); // New state for Kabid status filter
    const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isExporting, setIsExporting] = useState(false); // State for export loading

    // Updated initial form data with enum types
    const [formData, setFormData] = useState<Monitoring>({
        id: '',
        user_id: '',
        nama_anggota: '',
        kub: '',
        trip: 0,
        jenis_bbm: '',
        jumlah_bbm_liter: 0,
        daerah_penangkapan: '',
        keterangan: '',
        created_at: '',
        domisili: "Kota Palembang", // Default value
        bulan: "Januari", // Default value, now a string literal
        tahun: new Date().getFullYear(),
        detail_produksi: []
    });

    // Fetch data monitoring with new attributes
    const fetchMonitoringData = async () => {
        const { data, error } = await supabase
            .from('monitoring')
            .select(`
                *,
                detail_produksi(*)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching monitoring data:', error);
            setAlertMessage({ type: 'error', message: 'Gagal memuat data monitoring.' });
            return;
        }

        setMonitoringData(data as Monitoring[]);
        
        // Extract unique KUBs and years for filter dropdowns
        if (data) {
            // const kubs = Array.from(new Set(data.map(item => item.kub))); // Tidak lagi dibutuhkan
            const years = Array.from(new Set(data.map(item => item.tahun)));
            // setKubList(kubs); // Tidak lagi dibutuhkan
            setYearList(years.sort((a, b) => b - a)); // Sort years in descending order
        }
    };

    useEffect(() => {
        fetchMonitoringData();
    }, []);

    // Toggle row expansion
    const toggleRowExpansion = (monitoringId: string) => {
        setExpandedRows(prev => ({
            ...prev,
            [monitoringId]: !prev[monitoringId]
        }));
    };

    // Handling input changes with enum support
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let processedValue: string | number | Domisili | Bulan;

        if (name === 'trip' || name === 'jumlah_bbm_liter') {
            processedValue = value === '' ? 0 : parseInt(value, 10);
            if (isNaN(processedValue as number)) processedValue = 0; 
        } else if (name === 'tahun') {
            processedValue = value === '' ? new Date().getFullYear() : parseInt(value, 10);
            if (isNaN(processedValue as number)) processedValue = new Date().getFullYear();
        } else if (name === 'domisili' || name === 'bulan') {
            processedValue = value as Domisili | Bulan; // Assuming select values match enum values
        } else {
            processedValue = value;
        }

        setFormData(prev => ({
            ...prev,
            [name]: processedValue
        }));
    };

    // Handle edit
    const handleEdit = (monitoring: Monitoring) => {
        setSelectedMonitoring(monitoring);
        setFormData(monitoring);
        setIsDialogOpen(true);
    };

    // Save changes
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setAlertMessage(null); // Clear previous alerts

        try {
            const { error } = await supabase
                .from('monitoring')
                .update({
                    trip: formData.trip,
                    jenis_bbm: formData.jenis_bbm,
                    jumlah_bbm_liter: formData.jumlah_bbm_liter,
                    daerah_penangkapan: formData.daerah_penangkapan,
                    keterangan: formData.keterangan,
                    domisili: formData.domisili,
                    bulan: formData.bulan,
                    tahun: formData.tahun
                })
                .eq('id', formData.id);

            if (error) throw error;

            // Refresh data
            fetchMonitoringData();
            setIsDialogOpen(false);
            setAlertMessage({ type: 'success', message: 'Data berhasil diupdate!' });
        } catch (error: any) {
            console.error('Error updating monitoring:', error);
            setAlertMessage({ type: 'error', message: `Gagal mengupdate data: ${error.message}` });
        }
    };

    // Fungsi untuk menghapus monitoring
    const handleDelete = async (id: string) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

        setAlertMessage(null); // Clear previous alerts
        try {
            const { error } = await supabase
                .from('monitoring')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Refresh data
            fetchMonitoringData();
            setAlertMessage({ type: 'success', message: 'Data berhasil dihapus!' });
        } catch (error: any) {
            console.error('Error deleting monitoring:', error);
            setAlertMessage({ type: 'error', message: `Gagal menghapus data: ${error.message}` });
        }
    };

    // Apply all filters with corrected logic for status_verifikasi_kabid
    const filteredMonitoringData = monitoringData.filter(monitoring => {
        const domisiliMatch = (filterDomisili === '' || monitoring.domisili === filterDomisili);
        const kubMatch = (filterKUB === '' || monitoring.kub.toLowerCase().includes(filterKUB.toLowerCase()));
        const bulanMatch = (filterBulan === '' || monitoring.bulan === filterBulan);
        const tahunMatch = (filterTahun === '' || monitoring.tahun === filterTahun);

        let statusKabidMatch = true;
        if (filterStatusKabid !== '') {
            if (filterStatusKabid === KABID_VERIFICATION_STATUSES.PENDING) {
                // For "Menunggu", match if actual status is null, undefined, empty string, OR the string "Menunggu"
                // This covers cases where pending status is represented by a lack of explicit status.
                statusKabidMatch = !monitoring.status_verifikasi_kabid || monitoring.status_verifikasi_kabid === KABID_VERIFICATION_STATUSES.PENDING;
            } else {
                // For other statuses ("Disetujui", "Ditolak"), it requires an exact match.
                statusKabidMatch = monitoring.status_verifikasi_kabid === filterStatusKabid;
            }
        }

        return domisiliMatch && kubMatch && bulanMatch && tahunMatch && statusKabidMatch;
    });

    // Handle export with all filters
    const handleExport = () => {
        if (filteredMonitoringData.length === 0) {
            setAlertMessage({ type: 'error', message: 'Tidak ada data untuk diekspor.' });
            return;
        }
        setIsExporting(true);
        try {
            // Assuming exportToExcel is synchronous or you want to handle its promise
            exportToExcel(
                filterDomisili || '',
                filterKUB || '',
                filterBulan || '',
                filterTahun ? filterTahun.toString() : ''
            );
            // If exportToExcel is synchronous and successful, you might not need a success message here
            // as the browser will prompt for download.
        } catch (error) {
            console.error("Error exporting to Excel:", error);
            setAlertMessage({ type: 'error', message: 'Terjadi kesalahan saat mengekspor ke Excel.' });
        } finally {
            setIsExporting(false);
        }
    };

    // Helper function to get badge variant based on Kabid's verification status
    const getKabidStatusBadgeVariant = (status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
        if (!status || status === KABID_VERIFICATION_STATUSES.PENDING) {
            return "default"; // Greyish or bluish for pending
        }
        switch (status) {
            case KABID_VERIFICATION_STATUSES.APPROVED:
                return "secondary"; // Greenish for approved
            case KABID_VERIFICATION_STATUSES.REJECTED:
                return "destructive"; // Reddish for rejected
            default:
                return "outline"; // A neutral outline for other statuses
        }
    };
    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-900 dark:to-cyan-950 text-slate-700 dark:text-slate-200">
            <header className="bg-white/70 dark:bg-sky-950/70 backdrop-blur-md py-4 shadow-md sticky top-0 z-40 border-b border-sky-300/70 dark:border-sky-800/70">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="text-xl md:text-2xl font-semibold flex items-center text-sky-700 dark:text-sky-300">
                        <Ship className="mr-2.5 h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                        Data Monitoring
                    </div>
                </div>
            </header>

            <main className="container mx-auto py-6 md:py-8 px-4 md:px-6 flex-1">
            {alertMessage && (
                <Alert 
                    variant={alertMessage.type === 'error' ? 'destructive' : 'default'}
                    className="mb-4"
                >
                    <AlertTitle>{alertMessage.type === 'success' ? 'Berhasil' : 'Gagal'}</AlertTitle>
                    <AlertDescription>{alertMessage.message}</AlertDescription>
                </Alert>
            )}

            {/* Filters Section */}
            <div className="mb-6 p-4 md:p-6 border border-sky-200 dark:border-sky-700 rounded-xl bg-blue-50 dark:bg-slate-800 shadow-lg">
                <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                    <div className="flex-grow min-w-[150px] sm:min-w-[200px]">
                        <label htmlFor="filterKUB" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5">Nama KUB</label>
                        <input
                        type="text"
                        id="filterKUB"
                        value={filterKUB}
                        onChange={(e) => setFilterKUB(e.target.value)}
                        placeholder="Cari Nama KUB..."
                            className="w-full px-3 py-2 border border-sky-300 dark:border-sky-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                        />
                    </div>
                    <div className="flex-grow min-w-[150px] sm:min-w-[180px]">
                        <label htmlFor="filterDomisili" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5">Domisili</label>
                    <select
                        id="filterDomisili"
                        value={filterDomisili}
                        onChange={(e) => setFilterDomisili(e.target.value as Domisili)}
                            className="w-full px-3 py-2 border border-sky-300 dark:border-sky-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                    >
                        <option value="">Semua Domisili</option>
                        {DOMISILI_LIST.map((domisili) => (
                            <option key={domisili} value={domisili}>
                                {domisili}
                            </option>
                        ))}
                        </select>
                    </div>
                    <div className="flex-grow min-w-[120px] sm:min-w-[150px]">
                        <label htmlFor="filterBulan" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5">Bulan</label>
                    <select
                        id="filterBulan"
                        value={filterBulan}
                        onChange={(e) => setFilterBulan(e.target.value as Bulan)}
                            className="w-full px-3 py-2 border border-sky-300 dark:border-sky-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                    >
                        <option value="">Semua Bulan</option>
                        {BULAN_LIST.map((bulan) => (
                            <option key={bulan} value={bulan}>
                                {bulan}
                            </option>
                        ))}
                        </select>
                    </div>
                    <div className="flex-grow min-w-[100px] sm:min-w-[120px]">
                        <label htmlFor="filterTahun" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5">Tahun</label>
                    <select
                        id="filterTahun"
                        value={filterTahun}
                        onChange={(e) => setFilterTahun(e.target.value ? parseInt(e.target.value) : '')}
                            className="w-full px-3 py-2 border border-sky-300 dark:border-sky-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                    >
                        <option value="">Semua Tahun</option>
                        {yearList.map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                        </select>
                    </div>
                    <div className="flex-grow min-w-[150px] sm:min-w-[180px]">
                        <label htmlFor="filterStatusKabid" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5">Status Kabid</label>
                        <select
                            id="filterStatusKabid"
                            value={filterStatusKabid}
                            onChange={(e) => setFilterStatusKabid(e.target.value)}
                            className="w-full px-3 py-2 border border-sky-300 dark:border-sky-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                        >
                            <option value="">Semua Status Kabid</option>
                            {Object.values(KABID_VERIFICATION_STATUSES).map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {/* Export Button */}
                <div className="mt-4">
                    <button
                        onClick={handleExport}
                        disabled={isExporting || filteredMonitoringData.length === 0}
                        className="w-full sm:w-auto px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-md shadow-sm hover:shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                    >
                        {isExporting ? (
                            <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Mengekspor...</>
                        ) : "Export Sesuai Filter"}
                    </button>
                </div>
            </div>

            <div className="w-full bg-blue-50 dark:bg-slate-800 p-4 md:p-5 rounded-xl shadow-lg flex flex-col border border-sky-100 dark:border-sky-800">
                <h2 className="font-semibold text-xl mb-4 text-sky-700 dark:text-sky-200 border-b pb-3 border-sky-200 dark:border-sky-700">Daftar Monitoring</h2>
                <Table>
                    <TableHeader className="bg-sky-600 dark:bg-sky-700">
                        <TableRow>
                            <TableHead className="text-white font-semibold w-12">No.</TableHead> {/* Added No. column header */}
                            <TableHead className="text-white font-semibold">Nama Ketua</TableHead>
                            <TableHead className="text-white font-semibold">Nama KUB</TableHead>
                            <TableHead className="text-white font-semibold">Trip</TableHead>
                            <TableHead className="text-white font-semibold">BBM</TableHead>
                            <TableHead className="text-white font-semibold">Daerah Penangkapan</TableHead>
                            <TableHead className="text-white font-semibold">Domisili</TableHead>
                            <TableHead className="text-white font-semibold">Bulan</TableHead>
                            <TableHead className="text-white font-semibold">Tahun</TableHead>
                            {/* Kolom baru untuk Status Kabid */}
                            <TableHead className="text-white font-semibold text-center">Status Kabid</TableHead>
                            <TableHead className="text-center text-white font-semibold">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredMonitoringData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11} className="text-center py-10 text-slate-500 dark:text-slate-400">
                                    Tidak ada data monitoring yang sesuai dengan filter.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredMonitoringData.map((monitoring, index) => ( // Added index for numbering
                                <React.Fragment key={monitoring.id}>
                                    <TableRow className="hover:bg-sky-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <TableCell className="text-slate-600 dark:text-slate-300 text-center">{index + 1}</TableCell> {/* Added No. cell */}
                                        <TableCell className="font-medium text-slate-700 dark:text-slate-200">{monitoring.nama_anggota}</TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">{monitoring.kub}</TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">{monitoring.trip} hari/jam</TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">
                                            {monitoring.jenis_bbm} - {monitoring.jumlah_bbm_liter} Liter
                                        </TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">{monitoring.daerah_penangkapan}</TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">{monitoring.domisili}</TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">{monitoring.bulan}</TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-300">{monitoring.tahun}</TableCell>
                                        {/* Menampilkan Status Kabid */}
                                        <TableCell className="text-center">
                                            <Badge variant={getKabidStatusBadgeVariant(monitoring.status_verifikasi_kabid)}>
                                                {monitoring.status_verifikasi_kabid || KABID_VERIFICATION_STATUSES.PENDING}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center items-center space-x-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleRowExpansion(monitoring.id)}
                                                    className="text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200 px-2 flex items-center"
                                                >
                                                    <span className="mr-1 text-xs">Detail</span>
                                                    {expandedRows[monitoring.id] ?
                                                        <ChevronDown className="h-4 w-4" /> :
                                                        <ChevronRight className="h-4 w-4" />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 px-2"
                                                    onClick={() => handleEdit(monitoring)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost" // Or "destructive" for more emphasis
                                                    size="sm"
                                                    className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 px-2"
                                                    onClick={() => handleDelete(monitoring.id)}
                                                >
                                                    Hapus
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    {expandedRows[monitoring.id] && (
                                    <TableRow className="bg-sky-50/50 dark:bg-slate-700/30 hover:bg-sky-100/70 dark:hover:bg-slate-700/50">
                                        <TableCell colSpan={11}> {/* Adjusted colSpan */}
                                            <div className="p-4 bg-white dark:bg-slate-700/60 rounded-md m-1 shadow-inner">
                                                <h4 className="font-semibold mb-3 text-sky-700 dark:text-sky-300">Detail Produksi</h4>
                                                {monitoring.detail_produksi && monitoring.detail_produksi.length > 0 ? (
                                                    <div className="rounded-md border border-sky-200 dark:border-slate-600 overflow-hidden">
                                                        <Table>
                                                            <TableHeader className="bg-sky-100 dark:bg-slate-600">
                                                                <TableRow>
                                                                    <TableHead className="text-slate-600 dark:text-slate-300">Nama Ikan</TableHead>
                                                                    <TableHead className="text-slate-600 dark:text-slate-300">Jumlah (KG)</TableHead>
                                                                    <TableHead className="text-slate-600 dark:text-slate-300">Harga per KG</TableHead>
                                                                    <TableHead className="text-slate-600 dark:text-slate-300">Total Harga</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody className="divide-y divide-sky-100 dark:divide-slate-500">
                                                                {monitoring.detail_produksi.map((detail) => (
                                                                    <TableRow key={detail.id} className="hover:bg-white dark:hover:bg-slate-600/70">
                                                                        <TableCell className="text-slate-700 dark:text-slate-200">{detail.nama_ikan}</TableCell>
                                                                        <TableCell className="text-slate-700 dark:text-slate-200">{detail.jumlah_kg}</TableCell>
                                                                        <TableCell className="text-slate-700 dark:text-slate-200">Rp {detail.harga_per_kg.toLocaleString()}</TableCell>
                                                                        <TableCell className="text-slate-700 dark:text-slate-200">Rp {(detail.jumlah_kg * detail.harga_per_kg).toLocaleString()}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                ) : (
                                                    <p className="text-slate-600 dark:text-slate-400">Tidak ada detail produksi.</p>
                                                )}
                                                {/* Menampilkan Catatan Kabid di baris detail */}
                                                {monitoring.catatan_verifikasi_kabid && (
                                                    <div className="mt-3 pt-3 border-t border-sky-200 dark:border-slate-600">
                                                        <p className="text-sm text-slate-700 dark:text-slate-300"><strong>Catatan Kepala Bidang:</strong> {monitoring.catatan_verifikasi_kabid}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                </React.Fragment>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Dialog Edit */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-sky-700 dark:text-sky-300">Edit Data Monitoring - {formData.nama_anggota} ({formData.kub})</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave}>
                        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2"> {/* Added max-height and overflow */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="nama_anggota_dialog">Nama Anggota</Label>
                                    <Input
                                        id="nama_anggota_dialog"
                                        type="text"
                                        name="nama_anggota"
                                        value={formData.nama_anggota}
                                        onChange={handleInputChange}
                                        disabled 
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="kub_dialog">Nama KUB</Label>
                                    <Input
                                        id="kub_dialog"
                                        type="text"
                                        name="kub"
                                        value={formData.kub}
                                        onChange={handleInputChange}
                                        disabled 
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="trip_dialog">Trip (hari/jam)</Label>
                                    <Input
                                        id="trip_dialog"
                                        type="number"
                                        name="trip"
                                        value={formData.trip}
                                        onChange={handleInputChange}
                                        className="mt-1 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="jenis_bbm_dialog">Jenis BBM</Label>
                                    <Input
                                        id="jenis_bbm_dialog"
                                        type="text"
                                        name="jenis_bbm"
                                        value={formData.jenis_bbm}
                                        onChange={handleInputChange}
                                        className="mt-1 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="jumlah_bbm_liter_dialog">Jumlah BBM (Liter)</Label>
                                <Input
                                    id="jumlah_bbm_liter_dialog"
                                    type="number"
                                    name="jumlah_bbm_liter"
                                    value={formData.jumlah_bbm_liter}
                                    onChange={handleInputChange}
                                    className="mt-1 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500"
                                />
                            </div>
                            <div>
                                <Label htmlFor="daerah_penangkapan_dialog">Daerah Penangkapan</Label>
                                <Textarea
                                    id="daerah_penangkapan_dialog"
                                    name="daerah_penangkapan"
                                    value={formData.daerah_penangkapan}
                                    onChange={handleInputChange}
                                    className="mt-1 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <Label htmlFor="keterangan_dialog">Keterangan</Label>
                                <Textarea
                                    id="keterangan_dialog"
                                    name="keterangan"
                                    value={formData.keterangan}
                                    onChange={handleInputChange}
                                    className="mt-1 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500"
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="domisili_dialog">Domisili</Label>
                                    <select
                                        id="domisili_dialog"
                                        name="domisili"
                                        value={formData.domisili}
                                        onChange={handleInputChange}
                                        className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-sm focus:ring-sky-500 focus:border-sky-500"
                                    >
                                        {DOMISILI_LIST.map((domisili) => (
                                            <option key={domisili} value={domisili}>
                                                {domisili}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="bulan_dialog">Bulan</Label>
                                    <select
                                        id="bulan_dialog"
                                        name="bulan"
                                        value={formData.bulan}
                                        onChange={handleInputChange}
                                        className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-sm focus:ring-sky-500 focus:border-sky-500"
                                    >
                                        {BULAN_LIST.map((bulan) => (
                                            <option key={bulan} value={bulan}>
                                                {bulan}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="tahun_dialog">Tahun</Label>
                                    <Input
                                        id="tahun_dialog"
                                        type="number"
                                        name="tahun"
                                        value={formData.tahun}
                                        onChange={handleInputChange}
                                        className="mt-1 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="created_at_dialog">Tanggal Dibuat</Label>
                                    <Input
                                        id="created_at_dialog"
                                        type="text"
                                        value={new Date(formData.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        disabled
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                                className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                className="bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white"
                            >
                                Simpan Perubahan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            </main>
            
            <footer className="py-4 text-center text-sm text-slate-500 dark:text-slate-400 border-t border-sky-200 dark:border-sky-700">
                
            </footer>
        </div>
    );
}