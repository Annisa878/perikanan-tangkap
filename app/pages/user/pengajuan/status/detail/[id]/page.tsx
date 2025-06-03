"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

// Define types for our data
interface Pengajuan {
  id_pengajuan: string;
  kelompok_id: string;
  wilayah_penangkapan: string;
  dokumen_pengajuan: string;
  created_at: string;
  status_dokumen: any;
  status_verifikasi: string;
  catatan_verifikasi: string | null;
  status_verifikasi_kabid: string | null;
  catatan_verifikasi_kabid: string | null; 
  kelompok?: {
    nama_kub: string;
  };
}

interface DetailUsulan {
  id_detail_usulan: string;
  pengajuan_id: string;
  nama_alat: string;
  jumlah_alat: number;
}

interface AnggotaKelompok {
  id_anggota: string;
  kelompok_id: string;
  nama_anggota: string;
  jabatan: string;
  nik: string;
  no_kusuka: string;
}

export default function PengajuanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [pengajuan, setPengajuan] = useState<Pengajuan | null>(null);
  const [detailUsulan, setDetailUsulan] = useState<DetailUsulan[]>([]);
  const [anggotaKelompok, setAnggotaKelompok] = useState<AnggotaKelompok[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    const fetchPengajuanDetail = async () => {
      try {
        const id = params.id;
        if (!id) {
          setError("ID Pengajuan tidak ditemukan");
          setIsLoading(false);
          return;
        }

        // Get current user
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error("Authentication error");
        
        if (!userData?.user) {
          setError("Anda harus login terlebih dahulu");
          setIsLoading(false);
          return;
        }

        // Fetch pengajuan data
        const { data: pengajuanData, error: pengajuanError } = await supabase
          .from("pengajuan")
          .select(`
            *,
            kelompok:kelompok_id (
              nama_kub
            )
          `)
          .eq('id_pengajuan', id)
          .single();

        if (pengajuanError) throw pengajuanError;
        if (!pengajuanData) throw new Error("Pengajuan tidak ditemukan");
        
        setPengajuan(pengajuanData);

        // Determine if editing is allowed based on status
        const isKabidVerified = Boolean(pengajuanData.status_verifikasi_kabid) && 
                                ["Disetujui Sepenuhnya", "Disetujui Sebagian", "Ditolak"].includes(pengajuanData.status_verifikasi_kabid as string);
                                
        const editableStatuses = ["Menunggu", "Ditolak", "Perlu Revisi"];
        
        // Can edit only if admin has not approved AND kabid has not verified yet
        setCanEdit(editableStatuses.includes(pengajuanData.status_verifikasi) && !isKabidVerified);

        // Fetch detail usulan
        const { data: detailData, error: detailError } = await supabase
          .from("detail_usulan")
          .select("*")
          .eq('pengajuan_id', id);

        if (detailError) throw detailError;
        setDetailUsulan(detailData || []);
        
        // Fetch anggota kelompok
        const { data: anggotaData, error: anggotaError } = await supabase
          .from("anggota_kelompok")
          .select("*")
          .eq('kelompok_id', pengajuanData.kelompok_id);

        if (anggotaError) throw anggotaError;
        setAnggotaKelompok(anggotaData || []);
        
      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching pengajuan detail:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPengajuanDetail();
  }, [params]);

  // Helper function to format date (kept as is, but ensure it's what you need)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Updated helper function to display admin status with appropriate color (ocean theme)
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Diterima':
        return <span className="px-2 py-1 text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-full">Diterima</span>;
      case 'Ditolak':
        return <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300 rounded-full">Ditolak</span>;
      case 'Perlu Revisi':
        return <span className="px-2 py-1 text-xs bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-300 rounded-full">Perlu Revisi</span>;
      case 'Menunggu':
      default:
        return <span className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full">Menunggu</span>;
    }
  };

  // Updated helper function to display Kabid status with appropriate color (ocean theme)
  const getKabidStatusBadge = (status: string | null) => {
    if (!status || status === 'Menunggu') return <span className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full">Menunggu</span>;
    
    switch (status) {
      case 'Disetujui Sepenuhnya':
        return <span className="px-2 py-1 text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-full">Disetujui Sepenuhnya</span>;
      case 'Disetujui Sebagian':
        return <span className="px-2 py-1 text-xs bg-sky-100 dark:bg-sky-800/40 text-sky-700 dark:text-sky-300 rounded-full">Disetujui Sebagian</span>;
      case 'Ditolak':
        return <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300 rounded-full">Ditolak</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full">Menunggu</span>;
    }
  };
  
  // Function to check if pengajuan is locked (cannot be edited)
  const isPengajuanLocked = (): boolean => {
    if (!pengajuan) return true;
    
    // Check if verified by Kepala Bidang
    if (pengajuan.status_verifikasi_kabid && 
        ["Disetujui Sepenuhnya", "Disetujui Sebagian", "Ditolak"].includes(pengajuan.status_verifikasi_kabid)) {
      return true;
    }
    
    // Check if approved by admin
    if (pengajuan.status_verifikasi === "Diterima") {
      return true;
    }
    
    return false;
  };
  
  // Function to get file name from path
  const getFileName = (path: string) => {
    if (!path) return "Dokumen";
    const parts = path.split('/');
    return parts[parts.length - 1].substring(14); // Remove timestamp prefix
  };

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-slate-900 p-4"> {/* Ocean-themed background */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 shadow-xl rounded-lg"> {/* Card background */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-t-lg"> {/* Water gradient header */}
          <h1 className="text-xl font-bold text-white text-center">Detail Pengajuan</h1>
        </div>

        <div className="p-6">
          {/* Back button */}
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Kembali
            </button>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 dark:border-slate-600 border-t-sky-600 dark:border-t-sky-500"></div> {/* Spinner color */}
              <p className="mt-2 text-slate-600 dark:text-slate-400">Memuat data...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 p-4 rounded-md"> {/* Adjusted error message styling */}
              <p className="text-sm">{error}</p>
              {error === "Anda harus login terlebih dahulu" && (
                <div className="mt-4">
                  <Link 
                    href="/login" 
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm rounded-md"
                  >
                    Login
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Pengajuan info */}
          {!isLoading && !error && pengajuan && (
            <div className="space-y-6">
              {/* Status banners */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-md text-center font-medium ${
                  pengajuan.status_verifikasi === 'Diterima' ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700' :
                  pengajuan.status_verifikasi === 'Ditolak' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700' :
                  pengajuan.status_verifikasi === 'Perlu Revisi' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700' :
                  'bg-slate-50 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                }`}>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Status Verifikasi Data</div>
                  {getStatusBadge(pengajuan.status_verifikasi || 'Menunggu')}
                </div>
                
                <div className={`p-4 rounded-md text-center font-medium ${
                  pengajuan.status_verifikasi_kabid === 'Disetujui Sepenuhnya' ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700' :
                  pengajuan.status_verifikasi_kabid === 'Disetujui Sebagian' ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700' :
                  pengajuan.status_verifikasi_kabid === 'Ditolak' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700' :
                  'bg-slate-50 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                }`}>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Status Verifikasi Pengajuan</div>
                  {getKabidStatusBadge(pengajuan.status_verifikasi_kabid)}
                </div>
              </div>

              {/* Lock indicator if locked */}
              {isPengajuanLocked() && (
                <div className="bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 p-3 rounded-md flex items-center justify-center text-slate-700 dark:text-slate-300">
                  <svg className="w-5 h-5 mr-2 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                  {pengajuan.status_verifikasi_kabid && ["Disetujui Sepenuhnya", "Disetujui Sebagian", "Ditolak"].includes(pengajuan.status_verifikasi_kabid) 
                    ? <span>Pengajuan telah diproses oleh Kepala Bidang dan tidak dapat diubah</span>
                    : <span>Pengajuan telah diverifikasi oleh Admin dan sedang menunggu keputusan Kepala Bidang</span>
                  }
                </div>
              )}

              {/* Basic info card */}
              <div className="bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-sky-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">Informasi Pengajuan</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">ID Pengajuan</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">{pengajuan.id_pengajuan}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Nama KUB</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">{pengajuan.kelompok?.nama_kub || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Wilayah Penangkapan</p>
                    <p className="font-medium capitalize text-slate-700 dark:text-slate-300">{pengajuan.wilayah_penangkapan.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Tanggal Pengajuan</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">{formatDate(pengajuan.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Anggota kelompok card */}
              <div className="bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-sky-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">Anggota Kelompok</h2>
                {anggotaKelompok.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-sky-200 dark:divide-slate-700">
                      <thead className="bg-sky-50 dark:bg-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jabatan</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">NIK</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">No. KUSUKA</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-slate-800 divide-y divide-sky-100 dark:divide-slate-700">
                        {anggotaKelompok.map((anggota, index) => (
                          <tr key={anggota.id_anggota} className={index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-sky-50 dark:bg-slate-700/50'}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">{anggota.nama_anggota}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 capitalize">{anggota.jabatan}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">{anggota.nik}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">{anggota.no_kusuka}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-4">Tidak ada data anggota kelompok</p>
                )}
              </div>

              {/* Detail usulan card */}
              <div className="bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-sky-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">Detail Usulan Alat</h2>
                {detailUsulan.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-sky-200 dark:divide-slate-700">
                      <thead className="bg-sky-50 dark:bg-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">No</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama Alat</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jumlah</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-slate-800 divide-y divide-sky-100 dark:divide-slate-700">
                        {detailUsulan.map((item, index) => (
                          <tr key={item.id_detail_usulan} className={index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-sky-50 dark:bg-slate-700/50'}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{index + 1}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">{item.nama_alat}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">{item.jumlah_alat}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-4">Tidak ada detail usulan alat</p>
                )}
              </div>

              {/* Dokumen card */}
              <div className="bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-sky-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">Dokumen Pengajuan</h2>
                {pengajuan.dokumen_pengajuan ? (
                  <div className="flex items-center justify-between p-4 bg-sky-50 dark:bg-slate-700/50 rounded-md">
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-sky-600 dark:text-sky-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{getFileName(pengajuan.dokumen_pengajuan)}</span>
                    </div>
                    <a 
                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${pengajuan.dokumen_pengajuan}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white px-4 py-2 text-sm rounded-md"
                    >
                      Lihat Dokumen
                    </a>
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-4">Tidak ada dokumen yang tersedia</p>
                )}
              </div>

              {/* Catatan verifikasi Admin */}
              {pengajuan.catatan_verifikasi && (
                <div className="bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-sky-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">Catatan Verifikasi Admin</h2>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-md">
                    <p className="text-sm text-amber-700 dark:text-amber-300">{pengajuan.catatan_verifikasi}</p>
                  </div>
                </div>
              )}

              {/* Catatan verifikasi Kabid */}
              {pengajuan.catatan_verifikasi_kabid && (
                <div className="bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-sky-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">Catatan Verifikasi Kepala Bidang</h2>
                  <div className="p-4 bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 rounded-md">
                    <p className="text-sm text-sky-700 dark:text-sky-300">{pengajuan.catatan_verifikasi_kabid}</p>
                  </div>
                </div>
              )}

              {/* Action buttons section */}
              <div className="flex flex-col space-y-4">
                {/* Edit button - show only if can edit */}
                {canEdit && (
                  <div className="flex justify-end">
                    <Link
                      href={`/pages/user/pengajuan/edit/${pengajuan.id_pengajuan}`}
                      className="bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white px-4 py-2 text-sm rounded-md flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                      Edit Pengajuan
                    </Link>
                  </div>
                )}
                
                {/* Message if ditolak by admin but can resubmit */}
                {pengajuan.status_verifikasi === 'Ditolak' && !isPengajuanLocked() && (
                  <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 p-4 rounded-md">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      <span className="font-medium">Perhatian:</span> Pengajuan Anda ditolak oleh Admin. Anda dapat melakukan pengajuan ulang dengan memperbaiki data yang diperlukan.
                    </p>
                  </div>
                )}
                
                {/* Message if ditolak by kabid */}
                {pengajuan.status_verifikasi_kabid === 'Ditolak' && (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-4 rounded-md">
                    <p className="text-sm text-red-800 dark:text-red-300">
                      <span className="font-medium">Perhatian:</span> Pengajuan Anda telah ditolak oleh Kepala Bidang. Mohon perhatikan catatan verifikasi yang diberikan.
                    </p>
                  </div>
                )}
                
                {/* Message if perlu revisi */}
                {pengajuan.status_verifikasi === 'Perlu Revisi' && !isPengajuanLocked() && (
                  <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 p-4 rounded-md"> {/* Changed from orange to amber for consistency */}
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      <span className="font-medium">Perhatian:</span> Pengajuan Anda memerlukan revisi. Mohon perhatikan catatan verifikasi yang diberikan dan lakukan perbaikan yang diperlukan.
                    </p>
                  </div>
                )}
                
                {/* Message if disetujui sebagian */}
                {pengajuan.status_verifikasi_kabid === 'Disetujui Sebagian' && (
                  <div className="bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 p-4 rounded-md">
                    <p className="text-sm text-sky-800 dark:text-sky-300">
                      <span className="font-medium">Informasi:</span> Pengajuan Anda disetujui sebagian oleh Kepala Bidang. Mohon perhatikan catatan verifikasi untuk detail lebih lanjut.
                    </p>
                  </div>
                )}
                
                {/* Message if disetujui sepenuhnya */}
                {pengajuan.status_verifikasi_kabid === 'Disetujui Sepenuhnya' && (
                  <div className="bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700 p-4 rounded-md">
                    <p className="text-sm text-teal-800 dark:text-teal-300">
                      <span className="font-medium">Selamat!</span> Pengajuan Anda telah disetujui sepenuhnya oleh Kepala Bidang.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}