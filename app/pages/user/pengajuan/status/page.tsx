// pages/user/pengajuan/status/page.tsx

"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

// Define types for our data
interface Pengajuan {
  id_pengajuan: string;
  kelompok_id: string;
  user_id: string; // user_id is important for filtering
  // nama_kub: string; // This is redundant if fetched via kelompok relation
  wilayah_penangkapan: string;
  tanggal_pengajuan: string; // Tambahkan field untuk tanggal pengajuan manual
  dokumen_pengajuan: string;
  created_at: string;
  status_dokumen: any;
  status_verifikasi: string;
  catatan_verifikasi: string | null;
  status_verifikasi_kabid: string | null;  
  catatan_verifikasi_kabid: string | null; 
  total_keseluruhan: number | null; // Added based on DDL (numeric)
  no_bast: string | null; // Added based on DDL (text)
  dokumen_bast: string | null; // Added based on DDL (text)
  kelompok?: {
    nama_kub: string;
  };
}

// Helper for month name to number mapping
const monthNameToNumber: { [key: string]: number } = {
  "Januari": 1, "Februari": 2, "Maret": 3, "April": 4,
  "Mei": 5, "Juni": 6, "Juli": 7, "Agustus": 8,
  "September": 9, "Oktober": 10, "November": 11, "Desember": 12
};

export default function PengajuanList() {
  const supabase = createClient();
  const [pengajuanList, setPengajuanList] = useState<Pengajuan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [filterNamaKUB, setFilterNamaKUB] = useState<string>("");
  const [filterTahun, setFilterTahun] = useState<string>("");
  const [availableTahun, setAvailableTahun] = useState<string[]>([]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPengajuanIdForDelete, setSelectedPengajuanIdForDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPengajuan = useCallback(async () => {
    setIsLoading(true);
    setError(null); // Clear previous errors at the start

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser(); // Destructure user directly
      
      if (authError) {
        // Throw a new Error instance for consistent catch block handling
        throw new Error(authError.message || "Gagal melakukan autentikasi pengguna.");
      }
      
      if (!user) {
        setError("Anda harus login untuk melihat status pengajuan.");
        setIsLoading(false);
        return;
      }

      // Base query
      let query = supabase
        .from("pengajuan")
        .select(`
          *,
          kelompok:kelompok_id (
            nama_kub
          )
        `)
        .eq('user_id', user.id);

      // Apply filters
      if (filterNamaKUB) {
        query = query.ilike('kelompok.nama_kub', `%${filterNamaKUB}%`);
      }

      if (filterTahun) {
        // Assuming tanggal_pengajuan is a DATE or TIMESTAMP column in 'YYYY-MM-DD' or ISO format
        query = query.gte('tanggal_pengajuan', `${filterTahun}-01-01`); // Start of year
        query = query.lt('tanggal_pengajuan', `${parseInt(filterTahun) + 1}-01-01`); // Start of next year
      }
      
      const { data, error: dbError } = await query.order('created_at', { ascending: false });

      if (dbError) {
        throw new Error(dbError.message || 'Gagal memuat data status pengajuan.');
      }
      
      setPengajuanList(data || []);

      // Populate availableTahun from fetched data
      if (data) {
        const tahunSet = new Set<string>();
        data.forEach((item: Pengajuan) => {
          if (item.tanggal_pengajuan) {
            try {
              const year = new Date(item.tanggal_pengajuan).getFullYear().toString();
              if (year && !isNaN(parseInt(year))) tahunSet.add(year);
            } catch (e) { console.error("Error parsing date for availableTahun:", item.tanggal_pengajuan, e); }
          }
        });
        setAvailableTahun(Array.from(tahunSet).sort((a, b) => parseInt(b) - parseInt(a)));
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Terjadi kesalahan tidak terduga.';
      setError(errorMessage);
      console.error("Error fetching pengajuan:", err); // Log the full error for debugging
    } finally {
      setIsLoading(false);
    }
  }, [supabase, filterNamaKUB, filterTahun]);

  useEffect(() => {
    fetchPengajuan();

    const handleFocus = () => {
      // console.log("Window focused, re-fetching pengajuan data with current filters.");
      fetchPengajuan();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchPengajuan]);


  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
    }).format(date);
  };

  // Helper function to display admin status with appropriate color
  const getAdminStatusBadge = (status: string) => {
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
  
  // Helper function to display Kabid status with appropriate color
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

  // Function to determine if a pengajuan can be deleted by the user
  const canDeletePengajuan = (pengajuan: Pengajuan): boolean => {
    // Cannot delete if Kabid has made a final decision
    if (pengajuan.status_verifikasi_kabid && 
        ["Disetujui Sepenuhnya", "Disetujui Sebagian", "Ditolak"].includes(pengajuan.status_verifikasi_kabid)) {
      return false;
    }
    // Cannot delete if Admin has approved it (and it's waiting for Kabid)
    if (pengajuan.status_verifikasi === "Diterima") {
      return false;
    }
    // Can delete if status is Menunggu, Ditolak, or Perlu Revisi by Admin, and Kabid hasn't made a final decision
    return ["Menunggu", "Ditolak", "Perlu Revisi"].includes(pengajuan.status_verifikasi);
  };

  const handleOpenDeleteConfirm = (id: string) => {
    setSelectedPengajuanIdForDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleCloseDeleteConfirm = () => {
    setSelectedPengajuanIdForDelete(null);
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = async () => {
    if (!selectedPengajuanIdForDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      // 1. Delete related detail_usulan first
      const { error: detailError } = await supabase
        .from('detail_usulan')
        .delete()
        .eq('pengajuan_id', selectedPengajuanIdForDelete);

      if (detailError) throw new Error(`Gagal menghapus detail usulan: ${detailError.message}`);

      // 2. Delete the pengajuan
      const { error: pengajuanError } = await supabase
        .from('pengajuan')
        .delete()
        .eq('id_pengajuan', selectedPengajuanIdForDelete);

      if (pengajuanError) throw new Error(`Gagal menghapus pengajuan: ${pengajuanError.message}`);
      
      fetchPengajuan(); // Refresh the list
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menghapus pengajuan.");
      console.error("Error deleting pengajuan:", err);
    } finally {
      setIsDeleting(false);
      handleCloseDeleteConfirm();
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Daftar Pengajuan</h1>
          <Link 
            href="/pages/user/pengajuan/baru" 
            className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors shadow-md hover:shadow-lg"
          >
            + Buat Pengajuan Baru
          </Link>
        </div>

        {/* Filters Section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> {/* Disesuaikan menjadi 2 kolom */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">Filter Nama KUB:</label>
              <input
                type="text"
                placeholder="Masukkan nama KUB"
                value={filterNamaKUB}
                onChange={(e) => setFilterNamaKUB(e.target.value)}
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

        <div className="p-0 md:p-0"> {/* Removed extra padding here as filters and table have their own */}

          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 dark:border-slate-600 border-t-sky-600 dark:border-t-sky-500"></div> {/* Spinner color */}
              <p className="mt-2 text-gray-600 dark:text-gray-400">Memuat data...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 p-4 rounded-md my-4">
              <p className="text-sm">{error}</p>
              {error.includes("login") && ( // More robust check
                <div className="mt-3">
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

          {/* Empty state */}
          {!isLoading && !error && pengajuanList.length === 0 && (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md text-center">
              <p className="text-slate-600 dark:text-slate-400">Tidak ada data pengajuan yang ditemukan.</p>
              <div className="mt-4">
                <Link 
                  href="/pages/user/pengajuan/baru"
                  className="bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white px-4 py-2 text-sm rounded-md"
                >
                  Buat Pengajuan Baru
                </Link>
              </div>
            </div>
          )}

          {/* Data list */}
          {!isLoading && !error && pengajuanList.length > 0 && (
            <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-sky-100 dark:border-sky-800">
              <table className="min-w-full divide-y divide-sky-200 dark:divide-sky-700">
                <thead className="bg-gradient-to-r from-sky-500 to-cyan-500 dark:from-sky-700 dark:to-cyan-700">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">No</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Nama KUB</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Wilayah</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Tgl. Pengajuan</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Status Data (Admin)</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Status Akhir (Kabid)</th>
                    <th scope="col" className="px-6 py-3.5 text-center text-xs font-semibold text-white uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-sky-100 dark:divide-sky-800">
                  {pengajuanList.map((item, index) => (
                    <tr key={item.id_pengajuan} className="hover:bg-sky-50 dark:hover:bg-sky-700/30 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">{item.kelompok?.nama_kub || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200 capitalize">
                        {item.wilayah_penangkapan === 'perairan_umum_daratan' ? 'Perairan Daratan' : item.wilayah_penangkapan === 'laut' ? 'Laut' : item.wilayah_penangkapan}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatDate(item.tanggal_pengajuan)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getAdminStatusBadge(item.status_verifikasi || 'Menunggu')}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.status_verifikasi_kabid ? getKabidStatusBadge(item.status_verifikasi_kabid) : <span className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full">Menunggu</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <div className="flex justify-center items-center space-x-2">
                          <Link 
                            href={`/pages/user/pengajuan/status/detail/${item.id_pengajuan}`} 
                            className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-medium"
                          >
                            Detail
                          </Link>
                          {canDeletePengajuan(item) && (
                            <button 
                              onClick={() => handleOpenDeleteConfirm(item.id_pengajuan)}
                              className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-medium"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div> {/* End of p-6 or p-0 wrapper */}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Konfirmasi Hapus</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              Apakah Anda yakin ingin menghapus pengajuan ini? Tindakan ini tidak dapat diurungkan.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCloseDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-sm rounded-md text-slate-700 dark:text-slate-300 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm rounded-md text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 disabled:opacity-50 flex items-center"
              >
                {isDeleting ? (<><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Menghapus...</>) : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}