"use client";

import React from "react"; // Add this import
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
    trip: number;
    jenis_bbm: string;
    jumlah_bbm_liter: number;
    daerah_penangkapan: string;
    keterangan: string;
    domisili: string;
    detail_produksi: DetailProduksi[];
    total_produksi: number;
    total_pendapatan: number;
}

// Helper untuk mengubah nama bulan menjadi angka
const monthNameToNumber: { [key: string]: number } = {
    "Januari": 1, "Februari": 2, "Maret": 3, "April": 4,
    "Mei": 5, "Juni": 6, "Juli": 7, "Agustus": 8,
    "September": 9, "Oktober": 10, "November": 11, "Desember": 12
};

export default function DaftarLaporanPage() {
    const supabase = createClient();
    const router = useRouter();
    const [laporan, setLaporan] = useState<Laporan[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [filterKUB, setFilterKUB] = useState<string>("");
    const [filterTahun, setFilterTahun] = useState<string>(""); // State untuk filter tahun
    const [userId, setUserId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [availableTahun, setAvailableTahun] = useState<string[]>([]); // State untuk opsi tahun

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                
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
                    router.push("/sign-in");
                }
            } catch (error) {
                console.error("Error fetching user:", error);
                router.push("/sign-in");
            }
        };

        fetchUser();
    }, []);

    useEffect(() => {
        if (userId !== null) {
            fetchLaporanData();
        }
    }, [userId, filterKUB, filterTahun]);

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
            if (!isAdmin) {
                query = query.eq("user_id", userId);
            }
            
            if (filterKUB) {
                // Menggunakan ilike untuk pencarian case-insensitive dan partial matching
                query = query.ilike("kub", `%${filterKUB}%`);
            }

            if (filterTahun) {
                // Asumsikan ada kolom 'tahun' di tabel 'monitoring' atau Anda perlu mengekstrak tahun dari 'created_at'
                query = query.eq("tahun", parseInt(filterTahun)); // Jika ada kolom 'tahun' bertipe integer
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
                if (item.created_at) {
                    tahunSet.add(new Date(item.created_at).getFullYear().toString());
                } else if (item.tahun) { // Jika ada kolom tahun langsung
                    tahunSet.add(item.tahun.toString());
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

    const handleDetailClick = (id: string) => {
        router.push(`/pages/user/laporan/detail/${id}`);
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
        <div className="bg-slate-50 dark:bg-slate-900 min-h-screen p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Daftar Laporan Perikanan</h1>
                    <button
                        onClick={handleTambahLaporan}
                        className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors shadow-md hover:shadow-lg"
                    >
                        + Tambah Laporan
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> {/* Disesuaikan menjadi 2 kolom */}
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
                                onChange={(e) => setFilterTahun(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            >
                                <option value="">Semua Tahun</option>
                                {availableTahun.map((tahun) => (
                                    <option key={tahun} value={tahun}>{tahun}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md text-center">
                        <p className="text-slate-600 dark:text-slate-400">Memuat data...</p>
                    </div>
                ) : laporan.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md text-center">
                        <p className="text-slate-600 dark:text-slate-400">Tidak ada data laporan yang ditemukan.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-sky-100 dark:border-sky-800">
                        <table className="min-w-full divide-y divide-sky-200 dark:divide-sky-700">
                            <thead className="bg-gradient-to-r from-sky-500 to-cyan-500 dark:from-sky-700 dark:to-cyan-700">
                                <tr>
                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                        No
                                    </th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                        Tanggal
                                    </th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                        KUB
                                    </th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                        Nelayan
                                    </th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                        Bulan
                                    </th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                        Trip
                                    </th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                        BBM (L)
                                    </th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                        Total (Kg)
                                    </th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                        Pendapatan
                                    </th>
                                    <th scope="col" className="px-6 py-3.5 text-center text-xs font-semibold text-white uppercase tracking-wider">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-sky-100 dark:divide-sky-800">
                                {laporan.map((item, index) => (
                                    <React.Fragment key={item.id}>
                                        <tr className="hover:bg-sky-50 dark:hover:bg-sky-700/30 transition-colors duration-150">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">
                                                <div className="flex items-center">
                                                    <span>{index + 1}</span>
                                                    <button
                                                        onClick={() => toggleDetailProduksi(item.id)}
                                                        className="ml-2 p-1 rounded-full hover:bg-sky-100 dark:hover:bg-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                                        title={expandedRowId === item.id ? "Sembunyikan Detail Produksi" : "Lihat Detail Produksi"}
                                                    >
                                                        {expandedRowId === item.id ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                                            </svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                {formatDate(item.created_at)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">
                                                {item.kub}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">
                                                {item.nama_anggota}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">
                                                {item.bulan}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">
                                                {item.trip}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">
                                                {formatNumber(item.jumlah_bbm_liter)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-200">
                                                {formatNumber(item.total_produksi)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                                Rp {formatNumber(item.total_pendapatan)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 text-center">
                                                <div className="flex justify-center items-center space-x-2">
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
                                                            </table>
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
        </div>
    );
}