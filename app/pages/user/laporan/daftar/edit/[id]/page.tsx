"use client";

import React, { useEffect, useState, FormEvent, ChangeEvent } from "react"; // Import React and specific types
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

enum Bulan {
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
    Desember = "Desember",
}

interface Kelompok {
    id_kelompok: string; // Changed from id to id_kelompok
    nama_kub: string;
}

interface Anggota {
    id_anggota: string; // Assuming the column is named id_anggota
    kelompok_id: string;
    nama_anggota: string;
}

interface DetailProduksi {
    id?: string; // Optional for new items, required for existing ones
    monitoring_id?: string; // Should be present for existing items, optional for new ones before insert
    nama_ikan: string;
    jumlah_kg: number;
    harga_per_kg: number;
}

interface LaporanFormData {
    nama_kub: string;
    nama_anggota: string;
    bulan: Bulan;
    trip: number;
    jenis_bbm: string;
    jumlah_bbm_liter: number;
    daerah_penangkapan: string;
    keterangan: string;
    produksi: DetailProduksi[];
}

const initialFormData: LaporanFormData = {
    nama_kub: "",
    nama_anggota: "",
    bulan: Bulan.Januari,
    trip: 0,
    jenis_bbm: "",
    jumlah_bbm_liter: 0,
    daerah_penangkapan: "",
    keterangan: "",
    produksi: [{ nama_ikan: "", jumlah_kg: 0, harga_per_kg: 0 }],
};

export default function EditLaporanPage() {
    const supabase = createClient();
    const router = useRouter();
    const params = useParams();
    console.log("URL Params:", params); // Log untuk melihat params
    const reportId = params.id as string;

    const [userId, setUserId] = useState<string | null>(null);
    const [domisili, setDomisili] = useState<string | null>(null);
    const [kelompokList, setKelompokList] = useState<Kelompok[]>([]);
    const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
    const [filteredAnggotaList, setFilteredAnggotaList] = useState<Anggota[]>([]);
    const [selectedKelompokId, setSelectedKelompokId] = useState<string>("");
    const [formData, setFormData] = useState<LaporanFormData>(initialFormData);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [originalProduksi, setOriginalProduksi] = useState<DetailProduksi[]>([]);

    // Helper functions for currency formatting
    const formatRibuan = (num: number | string | undefined): string => {
        if (num === undefined || num === null || num === "" || isNaN(Number(num))) {
            return "Rp0";
        }
        const number = Number(num);
        return `Rp${number.toLocaleString("id-ID")}`;
    };

    const parseRibuan = (str: string): number => {
        if (!str) return 0;
        const numberStr = str.replace(/[^0-9]/g, "");
        return parseInt(numberStr, 10) || 0;
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push("/sign-in");
                    return;
                }

                const { data: userData, error: userError } = await supabase
                    .from("users")
                    .select("id, domisili")
                    .eq("email", user.email)
                    .single();

                if (userError || !userData) {
                    console.error("User not found or error:", userError);
                    router.push("/sign-in");
                    return;
                }
                setUserId(userData.id);
                setDomisili(userData.domisili);

                const { data: kelompokData, error: kelompokError } = await supabase.from("kelompok").select("id_kelompok, nama_kub"); // Changed id to id_kelompok
                if (kelompokError) throw new Error(`Failed to fetch kelompok data: ${kelompokError.message}`, { cause: kelompokError });
                setKelompokList(kelompokData || []);

                const { data: anggotaData, error: anggotaError } = await supabase.from("anggota_kelompok").select("id_anggota, kelompok_id, nama_anggota"); // Changed id to id_anggota
                if (anggotaError) throw new Error(`Failed to fetch anggota data: ${anggotaError.message}`, { cause: anggotaError });
                setAnggotaList(anggotaData || []);

                // Fetch existing report data
                if (reportId) {
                    console.log("Fetching report data for ID:", reportId); // Log ID yang digunakan
                    const { data: reportData, error: reportError } = await supabase
                        .from("monitoring")
                        .select(`
                            id,
                            created_at,
                            user_id,
                            domisili,
                            kub,
                            nama_anggota,
                            bulan,
                            trip,
                            jenis_bbm,
                            jumlah_bbm_liter,
                            daerah_penangkapan,
                            keterangan, detail_produksi(*)`) // Explicitly select columns and relationship
                        .eq("id", reportId)
                        .single();

                    if (reportError || !reportData) {
                        console.error("Report Data from Supabase:", reportData); // Log data yang diterima
                        throw new Error(`Failed to fetch report data (ID: ${reportId}): ${reportError?.message || 'Unknown error'}`, { cause: reportError });
                        alert("Gagal memuat data laporan.");
                        router.push("/pages/user/laporan/daftar");
                        return;
                    }

                    const kelompok = kelompokData?.find(k => k.nama_kub === reportData.kub);
                    if (kelompok) {
                        setSelectedKelompokId(kelompok.id_kelompok); // Changed to id_kelompok
                    }

                    setFormData({
                        nama_kub: reportData.kub || "",
                        nama_anggota: reportData.nama_anggota || "",
                        bulan: reportData.bulan as Bulan || Bulan.Januari,
                        trip: reportData.trip || 0,
                        jenis_bbm: reportData.jenis_bbm || "",
                        jumlah_bbm_liter: reportData.jumlah_bbm_liter || 0,
                        daerah_penangkapan: reportData.daerah_penangkapan || "",
                        keterangan: reportData.keterangan || "",
                        produksi: reportData.detail_produksi.map((p: any) => ({
                            // Use type assertions based on expected Supabase structure
                            id: p.id as string, 
                            monitoring_id: p.monitoring_id as string, 
                            nama_ikan: p.nama_ikan as string, 
                            jumlah_kg: p.jumlah_kg as number, 
                            harga_per_kg: p.harga_per_kg as number, 
                        })) || [{ nama_ikan: "", jumlah_kg: 0, harga_per_kg: 0 }], // Fallback if detail_produksi is null/empty
                    });
                    // Ensure originalProduksi also has correctly typed items
                    setOriginalProduksi(reportData.detail_produksi.map((p: any) => ({ id: p.id as string, monitoring_id: p.monitoring_id as string, nama_ikan: p.nama_ikan as string, jumlah_kg: p.jumlah_kg as number, harga_per_kg: p.harga_per_kg as number })) || []); // Deep copy and type assertion
                }
            } catch (error: unknown) { 
                console.error("Error during fetchInitialData:", error); 
                if (error instanceof Error && error.cause) {
                    // If we wrapped the original Supabase error, log its cause
                    console.error("Original Supabase error (cause):", error.cause);
                }

                let alertMessage = "Terjadi kesalahan saat memuat data.";
                if (error instanceof Error) {
                    alertMessage = `Kesalahan memuat data: ${error.message}`;
                } else if (typeof error === 'object' && error !== null && 'message' in error) {
                    // Attempt to handle Supabase-like error objects
                    const supabaseError = error as { message: string; details?: string; hint?: string; code?: string };
                    alertMessage = `Kesalahan memuat data (Supabase): ${supabaseError.message}`;
                    if (supabaseError.details) alertMessage += `\nDetail: ${supabaseError.details}`;
                    if (supabaseError.hint) alertMessage += `\nPetunjuk: ${supabaseError.hint}`;
                } else {
                    // Fallback for other types of thrown values
                    console.error("Error fetching initial data (unknown type):", error);
                }
                alert(alertMessage);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [reportId, router, supabase]);

    useEffect(() => {
        if (selectedKelompokId) {
            setFilteredAnggotaList(anggotaList.filter(a => a.kelompok_id === selectedKelompokId));
        } else {
            setFilteredAnggotaList([]);
        }
    }, [selectedKelompokId, anggotaList]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { // Use ChangeEvent type
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: (name === "trip" || name === "jumlah_bbm_liter") ? (parseInt(value, 10) || 0) : value, // Use parseInt with radix 10
        }));
    };

    const handleKelompokChange = (e: ChangeEvent<HTMLSelectElement>) => { // Use ChangeEvent type
        const kubName = e.target.value;
        const kelompok = kelompokList.find(k => k.nama_kub === kubName);
        setSelectedKelompokId(kelompok ? kelompok.id_kelompok : ""); // Changed to id_kelompok
        setFormData(prev => ({ ...prev, nama_kub: kubName, nama_anggota: "" }));
    };

    const handleAnggotaChange = (e: ChangeEvent<HTMLSelectElement>) => { // Use ChangeEvent type
        setFormData(prev => ({ ...prev, nama_anggota: e.target.value }));
    };

    const handleProduksiChange = (index: number, e: ChangeEvent<HTMLInputElement>) => { // Use ChangeEvent type
        const { name, value } = e.target;
        const list = [...formData.produksi];
        if (name === "harga_per_kg") {
            list[index] = { ...list[index], [name]: parseRibuan(value) };
        } else {
            list[index] = { ...list[index], [name]: name === "jumlah_kg" ? (parseFloat(value) || 0) : value };
        }
        setFormData(prev => ({ ...prev, produksi: list }));
    };

    const tambahProduksi = () => {
        setFormData(prev => ({
            ...prev,
            produksi: [...prev.produksi, { nama_ikan: "", jumlah_kg: 0, harga_per_kg: 0 }],
        }));
    };

    const hapusProduksi = (index: number) => {
        if (formData.produksi.length === 1) {
            alert("Minimal harus ada satu item produksi.");
            return;
        }
        const list = [...formData.produksi];
        list.splice(index, 1);
        setFormData(prev => ({ ...prev, produksi: list }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => { // Use FormEvent type
        e.preventDefault();
        if (!userId || !domisili || !reportId) {
            alert("Informasi pengguna tidak lengkap atau ID laporan tidak valid.");
            return;
        }
        setIsLoading(true);

        const errors: string[] = [];
        try {
            // 1. Update main monitoring data
            const { error: monitoringError } = await supabase
                .from("monitoring")
                .update({
                    kub: formData.nama_kub,
                    nama_anggota: formData.nama_anggota,
                    bulan: formData.bulan,
                    trip: formData.trip,
                    jenis_bbm: formData.jenis_bbm,
                    jumlah_bbm_liter: formData.jumlah_bbm_liter,
                    daerah_penangkapan: formData.daerah_penangkapan,
                    keterangan: formData.keterangan,
                    // user_id and domisili should not change on edit
                })
                .eq("id", reportId);

            if (monitoringError) { // Handle main update error specifically
                errors.push(`Gagal memperbarui data utama laporan: ${monitoringError.message}`);
                // Decide if you want to stop here or continue with detail_produksi
                // For now, let's assume we stop if the main update fails.
                throw new Error(errors.join("\n"));
            }

            // 2. Handle detail_produksi
            const originalProduksiIds = new Set(originalProduksi.map(p => p.id).filter(id => id !== undefined));
            const currentProduksiIds = new Set(formData.produksi.map(p => p.id).filter(id => id !== undefined));

            // Items to delete
            const itemsToDelete = originalProduksi.filter(p => p.id !== undefined && !currentProduksiIds.has(p.id)); // Check for undefined ID explicitly
            for (const item of itemsToDelete) {
                if (item.id) {
                    const { error: deleteError } = await supabase.from("detail_produksi").delete().eq("id", item.id);
                    if (deleteError) errors.push(`Gagal menghapus item produksi (${item.nama_ikan}): ${deleteError.message}`);
                }
            }


            // Items to update or insert
            for (const item of formData.produksi) {
                const detailData = {
                    monitoring_id: reportId,
                    nama_ikan: item.nama_ikan,
                    jumlah_kg: item.jumlah_kg,
                    harga_per_kg: item.harga_per_kg,
                };
                if (item.id !== undefined && originalProduksiIds.has(item.id)) { // Existing item, update it (Check for undefined ID explicitly)
                    const { error: updateError } = await supabase.from("detail_produksi").update(detailData).eq("id", item.id);
                    if (updateError) errors.push(`Gagal memperbarui item produksi (${item.nama_ikan}): ${updateError.message}`);
                } else { // New item, insert it (No ID means it's new)
                    const { error: insertError } = await supabase.from("detail_produksi").insert(detailData);
                    if (insertError) errors.push(`Gagal menambah item produksi (${item.nama_ikan}): ${insertError.message}`);
                }
            }

            if (errors.length > 0) {
                console.error("Errors during submission:", errors);
                alert(`Terjadi beberapa kesalahan:\n${errors.join("\n")}`);
            } else {
                alert("Laporan berhasil diperbarui!");
                router.push("/pages/user/laporan/daftar");
            }

        } catch (error: unknown) { // Explicitly type error as unknown
            console.error("Error submitting form:", error);
            let errorMessage = "Gagal memperbarui laporan. Silakan coba lagi.";
            if (errors.length > 0) {
                errorMessage = errors.join("\n");
            } else if (error instanceof Error) { // Safely check if it's an Error instance
                errorMessage = error.message;
            }
            alert(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && !formData.nama_kub) { // Show loading only if form data isn't populated yet
        return <div className="flex justify-center items-center min-h-screen bg-slate-100 dark:bg-slate-900"><p className="text-slate-700 dark:text-slate-300">Memuat data laporan...</p></div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-100 via-cyan-100 to-teal-100 dark:from-slate-900 dark:via-sky-800 dark:to-teal-800 py-8 px-4">
            <div className="container mx-auto max-w-3xl">
                <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-xl shadow-2xl">
                    <h1 className="text-2xl md:text-3xl font-bold text-center mb-8 text-slate-700 dark:text-slate-100">
                        Edit Laporan Monitoring
                    </h1>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Informasi Pelapor - Ensure fieldset is lowercase */}
                        <fieldset className="border border-slate-300 dark:border-slate-600 p-4 rounded-lg"> 
                            <legend className="text-lg font-semibold px-2 text-slate-600 dark:text-slate-300">Informasi Pelapor</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label htmlFor="nama_kub" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama KUB</label>
                                    <select id="nama_kub" name="nama_kub" value={formData.nama_kub} onChange={handleKelompokChange} required className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500">
                                        <option value="">Pilih KUB</option>
                                        {kelompokList.map(k => <option key={k.id_kelompok} value={k.nama_kub}>{k.nama_kub}</option>)} {/* Changed key to id_kelompok */}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="nama_anggota" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Anggota</label>
                                    <select id="nama_anggota" name="nama_anggota" value={formData.nama_anggota} onChange={handleAnggotaChange} required disabled={!selectedKelompokId} className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-200 dark:disabled:bg-slate-600">
                                        <option value="">Pilih Anggota</option>
                                        {filteredAnggotaList.map(a => <option key={a.id_anggota} value={a.nama_anggota}>{a.nama_anggota}</option>)} {/* Changed key to id_anggota */}
                                    </select>
                                </div>
                            </div>
                        </fieldset>

                        {/* Detail Laporan - Ensure fieldset is lowercase */}
                        <fieldset className="border border-slate-300 dark:border-slate-600 p-4 rounded-lg"> 
                            <legend className="text-lg font-semibold px-2 text-slate-600 dark:text-slate-300">Detail Laporan</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                {/* All other form fields from create page */}
                                <div>
                                    <label htmlFor="bulan" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bulan</label>
                                    <select id="bulan" name="bulan" value={formData.bulan} onChange={handleChange} required className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500">
                                        {Object.values(Bulan).map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="trip" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Trip (hari/jam)</label>
                                    <input type="number" id="trip" name="trip" value={formData.trip} onChange={handleChange} required className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500" />
                                </div>
                                <div>
                                    <label htmlFor="jenis_bbm" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jenis BBM</label>
                                    <input type="text" id="jenis_bbm" name="jenis_bbm" value={formData.jenis_bbm} onChange={handleChange} className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500" />
                                </div>
                                <div>
                                    <label htmlFor="jumlah_bbm_liter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">BBM (Liter)</label>
                                    <input type="number" id="jumlah_bbm_liter" name="jumlah_bbm_liter" value={formData.jumlah_bbm_liter} onChange={handleChange} className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500" />
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="daerah_penangkapan" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Daerah Penangkapan</label>
                                    <textarea id="daerah_penangkapan" name="daerah_penangkapan" value={formData.daerah_penangkapan} onChange={handleChange} rows={3} className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500"></textarea>
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="keterangan" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Keterangan</label>
                                    <textarea id="keterangan" name="keterangan" value={formData.keterangan} onChange={handleChange} rows={3} className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500"></textarea>
                                </div>
                            </div>
                        </fieldset>

                        {/* Produksi Ikan - Ensure fieldset is lowercase */}
                        <fieldset className="border border-slate-300 dark:border-slate-600 p-4 rounded-lg"> 
                            <legend className="text-lg font-semibold px-2 text-slate-600 dark:text-slate-300">Produksi Ikan</legend>
                            {formData.produksi.map((item, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-b border-slate-200 dark:border-slate-700 py-4 last:border-b-0">
                                    <div className="md:col-span-2">
                                        <label htmlFor={`nama_ikan_${index}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Ikan</label>
                                        <input type="text" id={`nama_ikan_${index}`} name="nama_ikan" value={item.nama_ikan} onChange={e => handleProduksiChange(index, e)} required className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500" />
                                    </div>
                                    <div>
                                        <label htmlFor={`jumlah_kg_${index}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jumlah (Kg)</label>
                                        <input type="number" step="0.1" id={`jumlah_kg_${index}`} name="jumlah_kg" value={item.jumlah_kg} onChange={e => handleProduksiChange(index, e)} required className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500" />
                                    </div>
                                    <div>
                                        <label htmlFor={`harga_per_kg_${index}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Harga/Kg (Rp)</label>
                                        <input type="text" id={`harga_per_kg_${index}`} name="harga_per_kg" value={formatRibuan(item.harga_per_kg)} onChange={e => handleProduksiChange(index, e)} required className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500" />
                                    </div>
                                    {formData.produksi.length > 1 && (
                                        <button type="button" onClick={() => hapusProduksi(index)} className="md:col-start-4 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium py-2.5 px-3 rounded-md border border-rose-500 dark:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors text-sm self-end">
                                            Hapus Ikan
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={tambahProduksi} className="mt-4 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium py-2 px-4 rounded-md border border-sky-500 dark:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors">
                                + Tambah Jenis Ikan
                            </button>
                        </fieldset>

                        <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed">
                            {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}