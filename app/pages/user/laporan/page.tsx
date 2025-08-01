"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";import { Bulan } from "@/app/lib/enums"; // Import Bulan enum
import { Ship } from "lucide-react"; // Import Ship icon

interface Kelompok {
    id_kelompok: string;
    nama_kub: string;
}

interface Anggota {
    id_anggota: string;
    nama_anggota: string;
    kelompok_id: string;
}

interface LaporanFormData {
    nama_anggota: string;
    nama_kub: string;
    bulan: Bulan | ""; // Allow empty string for initial state
    trip: number;
    jenis_bbm: string;
    jumlah_bbm_liter: number;
    daerah_penangkapan: string;
    keterangan: string;
    produksi: {
        nama_ikan: string;
        jumlah_kg: number;
        harga_per_kg: number;
    }[];
}

const initialFormData: LaporanFormData = {
    nama_anggota: "",
    nama_kub: "",
    bulan: "",
    trip: 0,
    jenis_bbm: "",
    jumlah_bbm_liter: 0,
    daerah_penangkapan: "",
    keterangan: "",
    produksi: [{
        nama_ikan: "",
        jumlah_kg: 0,
        harga_per_kg: 0
    }]
};
export default function LaporanPage() {
    const supabase = createClient();
    const router = useRouter();

    const [userId, setUserId] = useState<string | null>(null);
    const [domisili, setDomisili] = useState<string>(""); // Tetap dibutuhkan untuk submit laporan
    const [kelompokList, setKelompokList] = useState<Kelompok[]>([]);
    const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
    const [filteredAnggotaList, setFilteredAnggotaList] = useState<Anggota[]>([]);
    const [selectedKelompokId, setSelectedKelompokId] = useState<string | null>(null);
    const [formData, setFormData] = useState<LaporanFormData>(initialFormData);

    // State untuk validasi status KUB
    const [isKubApproved, setIsKubApproved] = useState<boolean>(false);
    const [kubValidationMessage, setKubValidationMessage] = useState<string>('');
    const [isCheckingKub, setIsCheckingKub] = useState<boolean>(false);

    const bulanOptions = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    // 1. Ambil Data Pengguna (termasuk userId dan domisili)
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user }} = await supabase.auth.getUser();

            if (user) {
                const { data: userData, error } = await supabase
                    .from("users")
                    .select("id, domisili") // Ambil domisili juga
                    .eq("email", user.email)
                    .single();

                if (userData) {
                    setUserId(userData.id);
                    setDomisili(userData.domisili || ""); // Set domisili
                } else {
                    console.error("User not found in database", error);
                    alert("User details not found. Please contact support.");
                    router.push("/sign-in");
                }
            } else {
                alert("Please log in to submit a report.");
                router.push("/sign-in");
            }
        };

        fetchUser();
    }, [supabase, router]); // Tambahkan router ke dependencies jika belum ada

    // 2. Ambil Daftar KUB berdasarkan pengajuan yang pernah dibuat oleh user_id
    useEffect(() => {
        if (!userId) {
            setKelompokList([]);
            setSelectedKelompokId(null); // Reset jika userId tidak tersedia
            return;
        }

        const fetchUserKUBsFromPengajuan = async () => {
            try {
                const { data: pengajuanData, error: pengajuanError } = await supabase
                    .from('pengajuan')
                    .select(`
                        kelompok_id, 
                        kelompok:kelompok_id (
                            id_kelompok,
                            nama_kub
                        )
                    `)
                    .eq('user_id', userId);

                if (pengajuanError) {
                    console.error("Error fetching user's KUBs from pengajuan:", pengajuanError);
                    throw pengajuanError;
                }

                if (pengajuanData) {
                    const userKUBs = pengajuanData
                        .flatMap(p => p.kelompok || []) // If p.kelompok is Kelompok[] | null, this flattens. If p.kelompok is Kelompok | null, this effectively becomes [p.kelompok] or [] then filtered.
                        .filter((k): k is Kelompok => k !== null && !!k.id_kelompok && !!k.nama_kub) // Ensure k is a valid Kelompok object and type guard
                        .reduce((acc, current) => {
                            // current is now guaranteed to be a Kelompok object
                            if (!acc.find(item => item.id_kelompok === current.id_kelompok)) {
                                acc.push(current); // Push the current object directly as it's already Kelompok
                            }
                            return acc;
                        }, [] as Kelompok[]);

                    setKelompokList(userKUBs);

                    // Jika KUB yang dipilih saat ini tidak lagi ada dalam daftar baru, reset.
                    if (selectedKelompokId && !userKUBs.find(k => k.id_kelompok === selectedKelompokId)) {
                        setSelectedKelompokId(null);
                    }
                } else {
                    setKelompokList([]);
                    setSelectedKelompokId(null);
                }
            } catch (error) {
                console.error("Failed to fetch KUBs for user from pengajuan:", error);
                setKelompokList([]);
                setSelectedKelompokId(null);
            }
        };

        fetchUserKUBsFromPengajuan();
    }, [userId, supabase]); // Bergantung pada userId

    // 3. Ambil semua Data Anggota sekali
    useEffect(() => {
        const fetchAnggotaData = async () => {
            try {
                const { data: anggotaData, error: anggotaError } = await supabase
                    .from("anggota_kelompok")
                    .select("id_anggota, nama_anggota, kelompok_id");
                
                if (anggotaError) throw anggotaError;
                setAnggotaList(anggotaData || []);
            } catch (error) {
                console.error("Error fetching anggota data:", error);
                setAnggotaList([]);
            }
        };
        fetchAnggotaData();
    }, [supabase]); // Hanya bergantung pada supabase client

    // 4. Saring Daftar Anggota dan perbarui formData ketika selectedKelompokId, anggotaList, atau kelompokList berubah
    useEffect(() => {
        if (selectedKelompokId && kelompokList.length > 0) {
            const selectedKelompok = kelompokList.find(k => k.id_kelompok === selectedKelompokId);
            setFormData(prev => ({
                ...prev,
                nama_kub: selectedKelompok?.nama_kub || "",
                nama_anggota: "" // Reset nama_anggota ketika KUB berubah
            }));
            const filtered = anggotaList.filter(anggota => anggota.kelompok_id === selectedKelompokId);
            setFilteredAnggotaList(filtered);
        } else {
            setFormData(prev => ({ // Reset nama_kub dan nama_anggota jika tidak ada KUB dipilih
                ...prev,
                nama_kub: "",
                nama_anggota: ""
            }));
            setFilteredAnggotaList([]);
        }
    }, [selectedKelompokId, anggotaList, kelompokList]); // Tambahkan kelompokList sebagai dependensi

    // Helper function to format number to Indonesian currency style (thousands separator)
    const formatRibuan = (num: number | string | undefined): string => {
        const number = Number(num); // Convert string input to number
        // Check for NaN, undefined, empty string that converts to 0, or actual 0
        if (isNaN(number) || num === undefined || (typeof num === 'string' && num.trim() === "") || number === 0) {
            return "Rp0";
        }
        return `Rp${number.toLocaleString('id-ID')}`;
    };

    // Helper function to parse Indonesian currency style string to number
    const parseRibuan = (str: string): number => {
        // Remove "Rp" prefix (case-insensitive) and any leading/trailing whitespace
        const cleanedStr = str.replace(/Rp\s*/gi, '').trim();
        // Remove thousand separators (dots), then replace comma with dot for parseFloat
        const numericString = cleanedStr.replace(/\./g, '').replace(/,/g, '.');
        const parsed = parseFloat(numericString);
        return isNaN(parsed) ? 0 : parsed;
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        if (name === 'trip' || name === 'jumlah_bbm_liter') {
            const numValue = parseInt(value, 10);
            setFormData(prev => ({
                ...prev,
                // Store 0 if input is not a valid number or empty, otherwise store the parsed number
                [name]: isNaN(numValue) ? 0 : numValue 
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const validateKUBStatus = async (kelompokId: string) => {
        if (!kelompokId) {
            setIsKubApproved(false);
            setKubValidationMessage('');
            return;
        }

        setIsCheckingKub(true);
        setKubValidationMessage('Memeriksa status pengajuan KUB...');
        try {
            const { data: latestPengajuan, error } = await supabase
                .from('pengajuan')
                .select('status_verifikasi, status_verifikasi_kabid')
                .eq('kelompok_id', kelompokId)
                .order('tanggal_pengajuan', { ascending: false })
                .limit(1)
                .single();

            if (error || !latestPengajuan) {
                setIsKubApproved(false);
                setKubValidationMessage('Tidak ditemukan data pengajuan untuk KUB ini. Laporan tidak dapat dibuat.');
                return;
            }

            const isAdminApproved = latestPengajuan.status_verifikasi === 'Diterima';
            const isKabidApproved = ['Disetujui Sepenuhnya', 'Disetujui Sebagian'].includes(latestPengajuan.status_verifikasi_kabid || '');

            if (isAdminApproved && isKabidApproved) {
                setIsKubApproved(true);
                setKubValidationMessage(''); // Hapus pesan jika berhasil
            } else {
                setIsKubApproved(false);
                setKubValidationMessage('Pengajuan untuk KUB ini belum disetujui sepenuhnya oleh Admin dan Kepala Bidang. Laporan tidak dapat dibuat.');
            }

        } catch (err) {
            console.error("Error validating KUB status:", err);
            setIsKubApproved(false);
            setKubValidationMessage('Gagal memvalidasi status KUB. Silakan coba lagi.');
        } finally {
            setIsCheckingKub(false);
        }
    };

    const handleKelompokChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const kelompokId = e.target.value;
        setSelectedKelompokId(kelompokId === "" ? null : kelompokId);

        // Memanggil fungsi validasi
        if (kelompokId) validateKUBStatus(kelompokId);
        else { setIsKubApproved(false); setKubValidationMessage(''); }
    };

    const handleAnggotaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const anggotaId = e.target.value;
        
        const selectedAnggota = anggotaList.find(a => a.id_anggota === anggotaId);
        
        setFormData(prev => ({
            ...prev,
            nama_anggota: selectedAnggota?.nama_anggota || ""
        }));
    };

    const handleProduksiChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const updatedProduksi = [...formData.produksi];
        let processedValue;

        if (name === 'jumlah_kg') {
            const numValue = parseFloat(value);
            // If parsing results in NaN (e.g., empty string or non-numeric), default to 0
            processedValue = isNaN(numValue) ? 0 : numValue;
        } else if (name === 'harga_per_kg') {
            // parseRibuan already handles invalid input by returning 0
            processedValue = parseRibuan(value);
        } else {
            processedValue = value;
        }

        updatedProduksi[index] = {
            ...updatedProduksi[index],
            [name]: processedValue
        };
        setFormData(prev => ({
            ...prev,
            produksi: updatedProduksi
        }));
    };
    const tambahProduksi = () => {
        setFormData(prev => ({
            ...prev,
            produksi: [...prev.produksi, {
                nama_ikan: "",
                jumlah_kg: 0,
                harga_per_kg: 0
            }]
        }));
    };

    const hapusProduksi = (index: number) => {
        const updatedProduksi = formData.produksi.filter((_, i) => i !== index);
        setFormData(prev => ({
            ...prev,
            produksi: updatedProduksi
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Tambahkan pengecekan akhir sebelum submit
        if (!isKubApproved) {
            alert(kubValidationMessage || 'KUB yang dipilih belum disetujui atau valid. Laporan tidak dapat dikirim.');
            return;
        }
    
        if (!userId) {
            alert("User ID not found. Please log in again.");
            return;
        }
    
        if (!userId || !domisili) {
            alert("User data not fully loaded. Please try again.");
            return;
        }
    
        try {
            // Get current year for the tahun field
            const currentYear = new Date().getFullYear();
            
            const { data: monitoringData, error: monitoringError } = await supabase
                .from("monitoring")
                .insert({
                    user_id: userId,
                    nama_anggota: formData.nama_anggota,
                    kub: formData.nama_kub, // Changed from nama_kub to kub to match DB schema
                    bulan: formData.bulan,
                    tahun: currentYear, // Adding the missing tahun field
                    trip: formData.trip,
                    jenis_bbm: formData.jenis_bbm,
                    jumlah_bbm_liter: formData.jumlah_bbm_liter,
                    daerah_penangkapan: formData.daerah_penangkapan,
                    keterangan: formData.keterangan,
                    domisili: domisili
                })
                .select()
                .single();
    
            if (monitoringError) throw monitoringError;
    
            const produksiData = formData.produksi.map(prod => ({
                monitoring_id: monitoringData.id,
                nama_ikan: prod.nama_ikan,
                jumlah_kg: prod.jumlah_kg,
                harga_per_kg: prod.harga_per_kg
                // Removed total_harga as it's a generated column
            }));
    
            const { error: produksiError } = await supabase
                .from("detail_produksi")
                .insert(produksiData);
    
            if (produksiError) throw produksiError;
    
            alert("Laporan berhasil disimpan!");
            setFormData(initialFormData); // Eksplisit reset form data
            setSelectedKelompokId(null); // Eksplisit reset kelompok yang dipilih
            router.push("/pages/user/laporan/daftar"); // Arahkan ke halaman daftar laporan
    
        } catch (error) {
            console.error("Gagal menyimpan laporan:", error);
            alert("Gagal menyimpan laporan. Silakan coba lagi.");
        }
    };

    return (
        // Mengadopsi layout utama dan latar belakang dari halaman user dashboard
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-900 dark:to-cyan-950 text-slate-700 dark:text-slate-200">
            {/* Header disesuaikan dengan gaya admin/user dashboard */}
            <header className="bg-white/70 dark:bg-sky-950/70 backdrop-blur-md py-4 shadow-md sticky top-0 z-40 border-b border-sky-300/70 dark:border-sky-800/70">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="text-xl md:text-2xl font-semibold flex items-center text-sky-700 dark:text-sky-300">
                        <Ship className="mr-2.5 h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                        Form Laporan Monitoring
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto py-6 md:py-8 px-4 md:px-6 flex-1">
                <div className="max-w-4xl mx-auto"> {/* Container to constrain form width if needed */}
                    <div className="w-full bg-blue-50 dark:bg-slate-800 shadow-xl rounded-xl overflow-hidden">
                        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                            {/* Informasi Pelapor */}
                    <div className="p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-sky-50 dark:bg-slate-700/30">
                        <h2 className="text-lg font-semibold text-sky-700 dark:text-sky-300 mb-4">Informasi Pelapor</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="kelompok_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama KUB</label>
                                <select
                                    id="kelompok_id"
                                    name="kelompok_id"
                                    value={selectedKelompokId || ""}
                                    onChange={handleKelompokChange}
                                    required
                                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all text-sm"
                                >
                                    <option value="">Pilih Kelompok</option>
                                    {kelompokList.map((kelompok) => (
                                        <option key={kelompok.id_kelompok} value={kelompok.id_kelompok}>
                                            {kelompok.nama_kub}
                                        </option>
                                    ))}
                                </select>
                                {/* Menampilkan pesan validasi */}
                                {isCheckingKub && <p className="text-sm mt-2 text-sky-600 dark:text-sky-400 animate-pulse">{kubValidationMessage}</p>}
                                {!isCheckingKub && kubValidationMessage && <p className="text-sm mt-2 text-red-600 dark:text-red-400">{kubValidationMessage}</p>}

                            </div>

                            <div>
                                <label htmlFor="anggota_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nama Ketua</label>
                                <select
                                    id="anggota_id"
                                    name="anggota_id"
                                    onChange={handleAnggotaChange}
                                    required
                                    disabled={!selectedKelompokId}
                                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all text-sm"
                                >
                                    <option value="">Pilih Anggota</option>
                                    {filteredAnggotaList.map((anggota) => (
                                        <option key={anggota.id_anggota} value={anggota.id_anggota}>
                                            {anggota.nama_anggota}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Gunakan fieldset untuk menonaktifkan sisa form berdasarkan hasil validasi */}
                    <fieldset disabled={!isKubApproved || isCheckingKub} className="space-y-6">
                        {/* Detail Laporan */}
                        <div className="p-4 border border-teal-200 dark:border-teal-700 rounded-lg bg-teal-50 dark:bg-slate-700/30">
                            <h2 className="text-lg font-semibold text-teal-700 dark:text-teal-300 mb-4">Detail Laporan</h2>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                <div>
                                    <label htmlFor="bulan" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Bulan</label>
                                    <select
                                        id="bulan"
                                        name="bulan"
                                        value={formData.bulan}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all text-sm"
                                    >
                                        <option value="">Pilih Bulan</option>
                                        {bulanOptions.map((month) => (
                                            <option key={month} value={month}>
                                                {month}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="trip" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Trip (hari/jam)</label>
                                    <input
                                        id="trip"
                                        type="number"
                                        name="trip"
                                        value={formData.trip}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all text-sm"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="jenis_bbm" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Jenis BBM</label>
                                    <input
                                        id="jenis_bbm"
                                        type="text"
                                        name="jenis_bbm"
                                        value={formData.jenis_bbm}
                                        onChange={handleChange}
                                        placeholder="Solar / Pertalite"
                                        className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all text-sm"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="jumlah_bbm_liter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">BBM (Liter)</label>
                                    <input
                                        id="jumlah_bbm_liter"
                                        type="number"
                                        name="jumlah_bbm_liter"
                                        value={formData.jumlah_bbm_liter} // Directly bind to the number in state
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="daerah_penangkapan" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Daerah Penangkapan</label>
                                    <textarea
                                        id="daerah_penangkapan"
                                        name="daerah_penangkapan"
                                        value={formData.daerah_penangkapan}
                                        onChange={handleChange}
                                        rows={3}
                                        placeholder="Contoh: Perairan Sungai Musi, Laut Jawa"
                                        className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all text-sm resize-none"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="keterangan" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Keterangan</label>
                                    <textarea
                                        id="keterangan"
                                        name="keterangan"
                                        value={formData.keterangan}
                                        onChange={handleChange}
                                        rows={3}
                                        placeholder="Catatan tambahan jika ada"
                                        className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all text-sm resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Produksi Ikan */}
                        <div className="p-4 md:p-6 bg-emerald-50 dark:bg-slate-700/50 rounded-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">Produksi Ikan</h2>
                                <button
                                    type="button"
                                    onClick={tambahProduksi}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    + Tambah Produksi
                                </button>
                            </div>
                            
                            {formData.produksi.map((produksi, index) => (
                                <div
                                    key={index}
                                    className="border border-emerald-200 dark:border-emerald-600 p-4 rounded-lg mb-4 bg-white dark:bg-slate-700 shadow-sm relative"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label htmlFor={`nama_ikan_${index}`} className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Nama Ikan</label>
                                            <input
                                                id={`nama_ikan_${index}`}
                                                type="text"
                                                name="nama_ikan"
                                                value={produksi.nama_ikan}
                                                onChange={(e) => handleProduksiChange(index, e)}
                                                required
                                                placeholder="Ikan Gabus"
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`jumlah_kg_${index}`} className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Jumlah (Kg)</label>
                                            <input
                                                id={`jumlah_kg_${index}`}
                                                type="number"
                                                name="jumlah_kg"
                                                value={produksi.jumlah_kg}
                                                onChange={(e) => handleProduksiChange(index, e)}
                                                required
                                                min="0"
                                                step="0.1"
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`harga_per_kg_${index}`} className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Harga/Kg (Rp)</label>
                                            <input
                                                id={`harga_per_kg_${index}`}
                                                type="text"
                                                inputMode="numeric"
                                                name="harga_per_kg"
                                                value={formatRibuan(produksi.harga_per_kg)}
                                                onChange={(e) => handleProduksiChange(index, e)}
                                                required
                                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 text-sm"
                                            />
                                        </div>
                                    </div>
                                    {formData.produksi.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => hapusProduksi(index)}
                                            className="absolute top-2 right-2 p-1 bg-red-100 hover:bg-red-200 dark:bg-red-700 dark:hover:bg-red-600 text-red-600 dark:text-red-200 rounded-full text-xs leading-none"
                                            aria-label="Hapus item produksi"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </fieldset>

                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                        <div>
                            <button
                                type="submit"
                                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg shadow-md hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:ring-offset-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!isKubApproved || isCheckingKub}
                            >
                                Kirim Laporan
                            </button>
                        </div>
                        </div>
                    </form>
                    </div> {/* Closing Card Form Utama */}
                </div>
            </main>
            {/* Footer disesuaikan dengan gaya admin/user dashboard */}
            <footer className="py-4 text-center text-sm text-slate-500 dark:text-slate-400 border-t border-sky-200 dark:border-sky-700">
                
            </footer>
        </div>
    );
}