"use client";

import React from "react";
import { useState, useEffect } from "react";
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
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge"; // Import Badge
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components
import exportToExcel from "@/utils/exportToExcel";

// Enum for Domisili
export enum Domisili {
    KabBanyuasin = "Kab. Banyuasin",
    KabEmpatLawang = "Kab. Empat Lawang",
    KabMuaraEnim = "Kab. Muara Enim",
    KabMusiBanyuasin = "Kab. Musi Banyuasin",
    KabMusiRawas = "Kab. Musi Rawas",
    KabMusiRawasUtara = "Kab. Musi Rawas Utara",
    KabOganIlir = "Kab. Ogan Ilir",
    KabOganKomeringIlir = "Kab. Ogan Komering Ilir",
    KabOganKomeringUlu = "Kab. Ogan Komering Ulu",
    KabOganKomeringUluSelatan = "Kab. Ogan Komering Ulu Selatan",
    KabOganKomeringUluTimur = "Kab. Ogan Komering Ulu Timur",
    KabPenukalAbabLematangIlir = "Kab. Penukal Abab Lematang Ilir",
    KotaLubukLinggau = "Kota Lubuk Linggau",
    KotaLahat = "Kota Lahat",
    KotaPalembang = "Kota Palembang",
    KotaPagarAlam = "Kota Pagar Alam",
    KotaPrabumulih = "Kota Prabumulih"
}

// Enum for Bulan
export enum Bulan {
    Januari = "Januari",
    Februari = "Februari",
    Maret = "Maret",
    April = "April",
    Mei = "Mei",
    Juni = "Juni",
    Juli = "Juli",
    Agustus = "Agustus",
    September = "September",
    Oktober = "Oktober",
    November = "November",
    Desember = "Desember"
}

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
    const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
        domisili: Domisili.KotaPalembang, // Default value
        bulan: Bulan.Januari, // Default value
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

    // Apply all filters
    const filteredMonitoringData = monitoringData.filter(monitoring =>
        (filterDomisili === '' || monitoring.domisili === filterDomisili) &&
        (filterKUB === '' || monitoring.kub.toLowerCase().includes(filterKUB.toLowerCase())) && // Updated KUB filter logic
        (filterBulan === '' || monitoring.bulan === filterBulan) &&
        (filterTahun === '' || monitoring.tahun === filterTahun)
    );

    // Handle export with all filters
    const handleExport = () => {
        exportToExcel(
            filterDomisili || '', 
            filterKUB || '', 
            filterBulan || '', 
            filterTahun ? filterTahun.toString() : ''
        );
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
        <div className="container mx-auto p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                <h1 className="text-3xl font-bold text-sky-700 dark:text-sky-300 mb-4 sm:mb-0">
                    Data Monitoring Perikanan
                </h1>
            </div>

            {alertMessage && (
                <Alert 
                    variant={alertMessage.type === 'error' ? 'destructive' : 'default'}
                    className="mb-4"
                >
                    <AlertTitle>{alertMessage.type === 'success' ? 'Berhasil' : 'Gagal'}</AlertTitle>
                    <AlertDescription>{alertMessage.message}</AlertDescription>
                </Alert>
            )}

                {/* Add action button here if needed, e.g., Add Monitoring */}

            {/* Filters Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 p-6 border border-sky-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-lg">
                <div>
                    <Label htmlFor="filterKUB" className="block mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">Filter KUB</Label>
                    <Input
                        type="text"
                        id="filterKUB"
                        value={filterKUB}
                        onChange={(e) => setFilterKUB(e.target.value)}
                        placeholder="Cari Nama KUB..."
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md text-sm focus:ring-sky-500 focus:border-sky-500"
                    />
                </div>
                <div>
                    <Label htmlFor="filterDomisili" className="block mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">Filter Domisili</Label>
                    <select
                        id="filterDomisili"
                        value={filterDomisili}
                        onChange={(e) => setFilterDomisili(e.target.value as Domisili)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md text-sm focus:ring-sky-500 focus:border-sky-500"
                    >
                        <option value="">Semua Domisili</option>
                        {Object.values(Domisili).map((domisili) => (
                            <option key={domisili} value={domisili}>
                                {domisili}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <Label htmlFor="filterBulan" className="block mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">Filter Bulan</Label>
                    <select
                        id="filterBulan"
                        value={filterBulan}
                        onChange={(e) => setFilterBulan(e.target.value as Bulan)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md text-sm focus:ring-sky-500 focus:border-sky-500"
                    >
                        <option value="">Semua Bulan</option>
                        {Object.values(Bulan).map((bulan) => (
                            <option key={bulan} value={bulan}>
                                {bulan}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <Label htmlFor="filterTahun" className="block mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">Filter Tahun</Label>
                    <select
                        id="filterTahun"
                        value={filterTahun}
                        onChange={(e) => setFilterTahun(e.target.value ? parseInt(e.target.value) : '')}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md text-sm focus:ring-sky-500 focus:border-sky-500"
                    >
                        <option value="">Semua Tahun</option>
                        {yearList.map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow-xl rounded-lg overflow-hidden">
                <Table>
                    <TableHeader className="bg-sky-600 dark:bg-sky-700">
                        <TableRow>
                            <TableHead className="text-white font-semibold">Nama Anggota</TableHead>
                            <TableHead className="text-white font-semibold">Nama KUB</TableHead>
                            <TableHead className="text-white font-semibold">Trip</TableHead>
                            <TableHead className="text-white font-semibold">BBM</TableHead>
                            <TableHead className="text-white font-semibold">Daerah Penangkapan</TableHead>
                            <TableHead className="text-white font-semibold">Domisili</TableHead>
                            <TableHead className="text-white font-semibold">Bulan</TableHead>
                            <TableHead className="text-white font-semibold">Tahun</TableHead>
                            {/* Kolom baru untuk Status Kabid */}
                            <TableHead className="text-white font-semibold">Status Kabid</TableHead>
                            <TableHead className="text-right text-white font-semibold">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredMonitoringData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center py-10 text-slate-500 dark:text-slate-400">
                                    Tidak ada data monitoring yang sesuai dengan filter.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredMonitoringData.map((monitoring) => (
                                <React.Fragment key={monitoring.id}>
                                    <TableRow className="hover:bg-sky-50 dark:hover:bg-slate-700/50 transition-colors">
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
                                        <TableCell>
                                            <Badge variant={getKabidStatusBadgeVariant(monitoring.status_verifikasi_kabid)}>
                                                {monitoring.status_verifikasi_kabid || KABID_VERIFICATION_STATUSES.PENDING}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end items-center space-x-1">
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
                                        <TableCell colSpan={10}>
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
                        <DialogTitle className="text-sky-700 dark:text-sky-300">Edit Data Monitoring</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave}> {/* Removed space-y-4, will use grid gap */}
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="nama_anggota_dialog">Nama Anggota</Label>
                                    <Input
                                        id="nama_anggota_dialog"
                                        type="text"
                                        name="nama_anggota"
                                        value={formData.nama_anggota}
                                        onChange={handleInputChange}
                                        disabled // Nama anggota biasanya tidak diubah dari sini
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
                                        disabled // KUB biasanya tidak diubah dari sini
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
                                        className="mt-1 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500"
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
                                        className="mt-1 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500"
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
                                    className="mt-1 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500"
                                />
                            </div>
                            <div>
                                <Label htmlFor="daerah_penangkapan_dialog">Daerah Penangkapan</Label>
                                <Textarea
                                    id="daerah_penangkapan_dialog"
                                    name="daerah_penangkapan"
                                    value={formData.daerah_penangkapan}
                                    onChange={handleInputChange}
                                    className="mt-1 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500"
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
                                    className="mt-1 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500"
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
                                        className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md text-sm focus:ring-sky-500 focus:border-sky-500"
                                    >
                                        {Object.values(Domisili).map((domisili) => (
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
                                        className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md text-sm focus:ring-sky-500 focus:border-sky-500"
                                    >
                                        {Object.values(Bulan).map((bulan) => (
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
                                        className="mt-1 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500"
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

            <div className="mt-6 flex justify-end">
                <Button
                    onClick={handleExport}
                    className="bg-teal-500 hover:bg-teal-600 text-white shadow-md hover:shadow-lg transition-shadow"
                >
                    Export to Excel
                </Button>
            </div>
        </div>
    );
}