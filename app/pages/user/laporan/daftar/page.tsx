"use client";

import React from "react"; // Add this import
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ship } from "lucide-react"; // Import Ship icon
import { createClient } from "@/utils/supabase/client";

interface DetailProduksi {
    id: string;
    monitoring_id: string;
    nama_ikan: string;
    jumlah_kg: number;
    harga_per_kg: number;
}

interface Laporan {
    id: string;
    created_at: string;
    nama_anggota: string;
    kub: string;
    bulan: string;
    tahun: number; // Added tahun to Laporan interface
    trip: number;
    jenis_bbm: string;
    jumlah_bbm_liter: number;
    daerah_penangkapan: string;
    keterangan: string;
    domisili: string;
    detail_produksi: DetailProduksi[]; // This should be DetailProduksi[]
    total_produksi: number;
    total_pendapatan: number;
}

// Define types for month filter, similar to pengajuan status page
interface AvailableBulan {
    value: string; // "01", "02", ... "12"
    display: string; // "Januari", "Februari", ...
}

const allMonths: AvailableBulan[] = [
    { value: "01", display: "Januari" }, { value: "02", display: "Februari" },
    { value: "03", display: "Maret" }, { value: "04", display: "April" },
    { value: "05", display: "Mei" }, { value: "06", display: "Juni" },
    { value: "07", display: "Juli" }, { value: "08", display: "Agustus" },
    { value: "09", display: "September" }, { value: "10", display: "Oktober" },
    { value: "11", display: "November" }, { value: "12", display: "Desember" }
];

export default function DaftarLaporanPage() {
    const supabase = createClient();
    const router = useRouter();
    const [laporan, setLaporan] = useState<Laporan[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [filterKUB, setFilterKUB] = useState<string>("");
    const [filterTahun, setFilterTahun] = useState<string>(""); // State untuk filter tahun
    const [filterBulan, setFilterBulan] = useState<string>(""); // State untuk filter bulan
    const [userId, setUserId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [availableTahun, setAvailableTahun] = useState<string[]>([]); // State untuk opsi tahun

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                
                if (user) {
                    const { data: userData, error } = await supabase
                        .from("users")
                        .select("id, role")
                        .eq("email", user.email)
                        .single();

                    if (userData) {
                        setUserId(userData.id);
                        setIsAdmin(userData.role === 'admin');
                    } else {
                        console.error("User not found in database", error);
                        router.push("/sign-in");
                    }
                } else {
                    if (authError) console.error("Auth error:", authError.message);
                    router.push("/sign-in");
                }
            } catch (error) {
                console.error("Error fetching user:", error);
                // Ensure router is available before pushing
                router.push("/sign-in");
            }
        };

        fetchUser();
    }, []);

    useEffect(() => {
        if (userId !== null) {
            fetchLaporanData();
        }
    }, [userId, filterKUB, filterTahun, filterBulan]); // Added filterBulan to dependencies

    const fetchLaporanData = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from("monitoring")
                .select(`
                    *,
                    detail_produksi (*)
                `);
            
            // Jika user bukan admin, hanya tampilkan laporan user tersebut
            if (!isAdmin && userId) { // Ensure userId is available
                query = query.eq("user_id", userId); // Assuming 'user_id' is the column name in 'monitoring' table
            }
            
            if (filterKUB) {
                // Menggunakan ilike untuk pencarian case-insensitive dan partial matching
                query = query.ilike("kub", `%${filterKUB}%`);
            }

            if (filterTahun) {
                query = query.eq("tahun", parseInt(filterTahun)); // Jika ada kolom 'tahun' bertipe integer
                if (filterBulan) {
                    // Find the display name of the month (e.g., "Januari") based on the value (e.g., "01")
                    const selectedMonthObject = allMonths.find(m => m.value === filterBulan);
                    if (selectedMonthObject) {
                        query = query.eq("bulan", selectedMonthObject.display); // Filter by month name
                    }
                }
            }
            
            const { data, error } = await query.order('created_at', { ascending: false });
            
            if (error) throw error;

            // Proses data untuk digunakan di UI
            const processedData = data.map((item: any) => {
                // Hitung total produksi dan pendapatan
                let totalProduksi = 0;
                let totalPendapatan = 0;

                if (item.detail_produksi && item.detail_produksi.length > 0) {
                    item.detail_produksi.forEach((p: DetailProduksi) => {
                        totalProduksi += p.jumlah_kg;
                        totalPendapatan += p.jumlah_kg * p.harga_per_kg;
                    });
                }

                return {
                    ...item,
                    total_produksi: totalProduksi,
                    total_pendapatan: totalPendapatan
                };
            });

            setLaporan(processedData);
            

            // Dapatkan daftar unik tahun untuk filter
            const tahunSet = new Set<string>();
            data.forEach((item: any) => {
                if (item.tahun) { 
                    tahunSet.add(item.tahun.toString()); // Prefer 'tahun' column if available
                }
            });
            setAvailableTahun(Array.from(tahunSet).sort((a, b) => parseInt(b) - parseInt(a))); // Urutkan tahun terbaru dulu
            
            // Jika bukan admin, dan belum ada filter KUB, set filter KUB berdasarkan KUB pertama yang ditemukan dari data user
            if (!isAdmin && !filterKUB && data.length > 0 && data[0].kub) {
                // Tidak otomatis set filter KUB lagi, biarkan user yang input
            } else if (isAdmin) {
                 // Untuk admin, dapatkan semua KUB unik untuk dropdown (jika masih ingin mempertahankan uniqueKUB untuk keperluan lain)
            }
            
            setLoading(false);
        } catch (error) {
            console.error("Error fetching laporan data:", error);
            setLoading(false);
        }
    };

    const handleTahunChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTahun = e.target.value;
        setFilterTahun(newTahun);
        setFilterBulan(""); // Reset month filter when year changes
    };

    const handleEditClick = (id: string) => {
        router.push(`/pages/user/laporan/daftar/edit/${id}`);
    };

    const handleDeleteClick = async (id: string) => {
        if (confirm("Apakah Anda yakin ingin menghapus laporan ini?")) {
            try {
                // Hapus detail produksi terlebih dahulu (foreign key constraint)
                const { error: produksiError } = await supabase
                    .from("detail_produksi")
                    .delete()
                    .eq("monitoring_id", id);
                
                if (produksiError) throw produksiError;
                
                // Kemudian hapus data monitoring
                const { error: monitoringError } = await supabase
                    .from("monitoring")
                    .delete()
                    .eq("id", id);
                
                if (monitoringError) throw monitoringError;
                
                alert("Laporan berhasil dihapus");
                fetchLaporanData();
            } catch (error) {
                console.error("Error deleting laporan:", error);
                alert("Gagal menghapus laporan. Silakan coba lagi.");
            }
        }
    };

    const handleTambahLaporan = () => {
        router.push("/pages/user/laporan");
    };

    const toggleDetailProduksi = (id: string) => {
        setExpandedRowId(prevId => (prevId === id ? null : id));
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('id-ID').format(num);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(date);
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-900 dark:to-cyan-950 text-slate-700 dark:text-slate-200">
            <header className="bg-white/70 dark:bg-sky-950/70 backdrop-blur-md py-4 shadow-md sticky top-0 z-40 border-b border-sky-300/70 dark:border-sky-800/70">
                <div className="container mx-auto px-4 md:px-6 flex justify-between items-center"> {/* Added flex justify-between items-center */}
                    <div className="text-xl md:text-2xl font-semibold flex items-center text-sky-700 dark:text-sky-300">
                        <Ship className="mr-2.5 h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                        Daftar Laporan Perikanan
                    </div>
                    <button
                        onClick={handleTambahLaporan}
                        className="bg-sky-700 hover:bg-sky-800 dark:bg-sky-300 dark:hover:bg-sky-400 text-white dark:text-sky-800 px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-colors flex items-center"
                    >
                        {/* Anda bisa menambahkan ikon di sini jika mau, contoh: <PlusCircle className="mr-2 h-5 w-5" /> */}
                        + Tambah Laporan
                    </button>
                </div>
            </header>

            <main className="container mx-auto py-6 md:py-8 px-4 md:px-6 flex-1">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-blue-50 dark:bg-slate-800 rounded-lg shadow-md p-4 mb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"> {/* Adjusted for 3 columns */}
                            <div>
                                <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">Filter KUB:</label>
                                <input
                                    type="text"
                                    placeholder="Masukkan nama KUB"
                                    value={filterKUB}
                                    onChange={(e) => setFilterKUB(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">Filter Tahun:</label>
                                <select
                                    value={filterTahun}
                                    onChange={handleTahunChange}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                >
                                    <option value="">Semua Tahun</option>
                                    {availableTahun.map((tahun) => (
                                        <option key={tahun} value={tahun}>{tahun}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">Filter Bulan:</label>
                                <select
                                    value={filterBulan}
                                    onChange={(e) => setFilterBulan(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!filterTahun} // Disable if no year is selected
                                >
                                    <option value="">Semua Bulan</option>
                                    {allMonths.map((bulan) => ( // Use allMonths directly as availableBulan is not dynamically populated for months
                                        <option key={bulan.value} value={bulan.value}>{bulan.display}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="bg-blue-50 dark:bg-slate-800 p-8 rounded-lg shadow-md text-center">
                             <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 dark:border-slate-600 border-t-sky-600 dark:border-t-sky-500"></div>
                            <p className="mt-2 text-slate-600 dark:text-slate-400">Memuat data...</p>
                        </div>
                    ) : laporan.length === 0 ? (
                        <div className="bg-blue-50 dark:bg-slate-800 p-8 rounded-lg shadow-md text-center">
                            <p className="text-slate-700 dark:text-slate-300">Tidak ada data laporan yang ditemukan.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-sky-100 dark:border-sky-800">
                            <table className="min-w-full divide-y divide-sky-200 dark:divide-sky-700">
                                <thead className="bg-gradient-to-r from-sky-500 to-cyan-500 dark:from-sky-700 dark:to-cyan-700">
                                    <tr>
                                        <th scope="col" className="px-2 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider w-12"> {/* Reduced padding and width */}
                                            No
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider"> {/* Reduced padding */}
                                            Tgl Input
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider max-w-xs"> {/* Reduced padding, added max-width */}
                                            Nama KUB
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider max-w-xs"> {/* Reduced padding, added max-width */}
                                            Nama Ketua
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider"> {/* Reduced padding */}
                                            Bulan
                                        </th>
                                        <th scope="col" className="px-2 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider"> {/* Reduced padding */}
                                            Trip
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider"> {/* Reduced padding */}
                                            BBM (L)
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider"> {/* Reduced padding */}
                                            Total (Kg)
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider"> {/* Reduced padding */}
                                            Pendapatan
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-center text-xs font-semibold text-white uppercase tracking-wider w-28"> {/* Reduced padding and width */}
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-blue-50 dark:bg-slate-800 divide-y divide-sky-100 dark:divide-sky-800">
                                    {laporan.map((item, index) => (
                                        <React.Fragment key={item.id}>
                                            <tr className="hover:bg-sky-50 dark:hover:bg-sky-700/30 transition-colors duration-150">
                                                <td className="px-2 py-4 text-sm text-slate-900 dark:text-slate-200"> {/* Reduced padding */}
                                                    {index + 1}
                                                </td>
                                                <td className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400"> {/* Reduced padding, removed whitespace-nowrap */}
                                                    {formatDate(item.created_at)}
                                                </td>
                                                <td className="px-3 py-4 text-sm text-slate-900 dark:text-slate-200 truncate max-w-xs" title={item.kub}> {/* Reduced padding, added truncate and title */}
                                                    {item.kub} 
                                                </td>
                                                <td className="px-3 py-4 text-sm text-slate-900 dark:text-slate-200 truncate max-w-xs" title={item.nama_anggota}> {/* Reduced padding, added truncate and title */}
                                                    {item.nama_anggota} 
                                                </td>
                                                <td className="px-3 py-4 text-sm text-slate-900 dark:text-slate-200"> {/* Reduced padding, removed whitespace-nowrap */}
                                                    {item.bulan}
                                                </td>
                                                <td className="px-2 py-4 text-sm text-slate-900 dark:text-slate-200"> {/* Reduced padding */}
                                                    {item.trip}
                                                </td>
                                                <td className="px-3 py-4 text-sm text-slate-900 dark:text-slate-200"> {/* Reduced padding */}
                                                    {formatNumber(item.jumlah_bbm_liter)}
                                                </td>
                                                <td className="px-3 py-4 text-sm font-medium text-slate-900 dark:text-slate-200"> {/* Reduced padding */}
                                                    {formatNumber(item.total_produksi)}
                                                </td>
                                                <td className="px-3 py-4 text-sm font-medium text-emerald-600 dark:text-emerald-400"> {/* Reduced padding, removed whitespace-nowrap */}
                                                    Rp {formatNumber(item.total_pendapatan)}
                                                </td>
                                                <td className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400 text-center"> {/* Reduced padding, removed whitespace-nowrap */}
                                                    <div className="flex justify-center items-center space-x-2">
                                                        <button
                                                            onClick={() => toggleDetailProduksi(item.id)}
                                                            className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-medium"
                                                        >
                                                            Detail
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditClick(item.id)}
                                                            className="text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 font-medium"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(item.id)}
                                                            className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-medium"
                                                        >
                                                            Hapus
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedRowId === item.id && (
                                                <tr key={`${item.id}-detail`} className="bg-sky-50 dark:bg-sky-800/50">
                                                    <td colSpan={10} className="px-6 py-4">
                                                        <div className="mb-3">
                                                            <h4 className="text-md font-semibold text-sky-700 dark:text-sky-300">Detail Produksi:</h4>
                                                            {item.jenis_bbm && (
                                                                <p className="text-sm text-sky-600 dark:text-sky-400 mt-1">Jenis BBM: <span className="font-medium text-sky-700 dark:text-sky-300">{item.jenis_bbm}</span></p>
                                                            )}
                                                        </div>
                                                        {item.detail_produksi && item.detail_produksi.length > 0 ? (
                                                            <div className="overflow-x-auto rounded-lg shadow-sm border border-sky-200 dark:border-sky-700">
                                                                <table className="min-w-full divide-y divide-sky-200 dark:divide-sky-700">
                                                                    <thead className="bg-sky-100 dark:bg-sky-700">
                                                                        <tr>
                                                                            <th className="px-4 py-2.5 text-left text-xs font-medium text-sky-600 dark:text-sky-300 uppercase">Nama Ikan</th>
                                                                            <th className="px-4 py-2.5 text-right text-xs font-medium text-sky-600 dark:text-sky-300 uppercase">Jumlah (Kg)</th>
                                                                            <th className="px-4 py-2.5 text-right text-xs font-medium text-sky-600 dark:text-sky-300 uppercase">Harga/Kg (Rp)</th>
                                                                            <th className="px-4 py-2.5 text-right text-xs font-medium text-sky-600 dark:text-sky-300 uppercase">Subtotal (Rp)</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                                                        {item.detail_produksi.map(detail => (
                                                                            <tr key={detail.id}>
                                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{detail.nama_ikan}</td>
                                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300 text-right">{formatNumber(detail.jumlah_kg)}</td>
                                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300 text-right">{formatNumber(detail.harga_per_kg)}</td>
                                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300 text-right">{formatNumber(detail.jumlah_kg * detail.harga_per_kg)}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table> {/* Added closing table tag */}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-sky-600 dark:text-sky-400">Tidak ada detail produksi untuk laporan ini.</p>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
            <footer className="py-4 text-center text-sm text-slate-500 dark:text-slate-400 border-t border-sky-200 dark:border-sky-700">
                
            </footer>
        </div> // Closing the outermost div that starts after "return ("
    );
}