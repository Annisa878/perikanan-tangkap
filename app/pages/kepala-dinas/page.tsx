"use client";
import React from "react"; // Added React import
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import {
  LayoutDashboard,  
  Users,
  CheckCircle,
  // Clock, // Dihapus karena tidak digunakan lagi
  // Clock, // Dihapus karena tidak digunakan lagi
  BarChart3, Loader2, Ship, // Ditambahkan Loader2 dan Ship
  AlertCircle,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  pengajuanMenungguVerifikasiKabid: number;
  pengajuanDisetujuiKabid: number;
  totalLaporanMonitoring: number;
}
interface SummaryChartData {
  name: string;
  Jumlah: number; // Using "Jumlah" to be consistent with TrendChart's dataKey
}


const KABID_APPROVED_MONITORING_STATUS = 'Disetujui'; // Status yang sama dengan di halaman laporan-akhir

export default function KepalaDinasDashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<DashboardStats | null>(null); // Tetap null hingga data dimuat
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Removed trend data states: pengajuanTrendData, monitoringTrendData

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          setError("Tidak dapat memuat data pengguna. Silakan login kembali.");
          setIsLoading(false);
          return;
        }

        // Fetch user's role from the 'users' table
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !userProfile) {
          console.error("Error fetching user profile:", profileError);
          setError("Gagal memuat profil pengguna. Silakan coba lagi.");
          setIsLoading(false);
          return;
        }

        if (userProfile.role !== 'kepala dinas') {
          setError("Akses ditolak. Halaman ini khusus untuk Kepala Dinas.");
          setIsLoading(false);
          // Optional: Redirect to home or sign-in page
          // import { useRouter } from "next/navigation"; (if not already imported)
          // const router = useRouter(); router.push('/');
          return; // Stop further data fetching if role is incorrect
        }

        // Fetch stats and chart data
        const [
          menungguKabidRes,
          disetujuiSepenuhnyaRes,
          disetujuiSebagianRes,
          laporanMonitoringRes,
        ] = await Promise.all([
          supabase
            .from('pengajuan')
            .select('id_pengajuan', { count: 'exact', head: true })
            .eq('status_verifikasi', 'Diterima') // Approved by Admin
            .eq('status_verifikasi_kabid', 'Menunggu Persetujuan'),
          supabase
            .from('pengajuan')
            .select('id_pengajuan', { count: 'exact', head: true })
            .eq('status_verifikasi_kabid', 'Disetujui Sepenuhnya'),
          supabase
            .from('pengajuan')
            .select('id_pengajuan', { count: 'exact', head: true })
            .eq('status_verifikasi_kabid', 'Disetujui Sebagian'),
          supabase
            .from('monitoring')
            .select('id', { count: 'exact', head: true })
            .eq('status_verifikasi_kabid', KABID_APPROVED_MONITORING_STATUS), // Tambahkan filter ini jika ingin sinkron
        ]);

        // Consolidate error checking after all promises
        const allErrors = [
          menungguKabidRes.error, 
          disetujuiSepenuhnyaRes.error, 
          disetujuiSebagianRes.error, 
          laporanMonitoringRes.error,
        ].filter(Boolean);

        if (allErrors.length > 0) {
          console.error("Errors fetching dashboard data (stats or charts):", allErrors);
          throw new Error("Sebagian data untuk dashboard gagal dimuat.");
        }

        setStats({
          pengajuanMenungguVerifikasiKabid: menungguKabidRes.count ?? 0,
          pengajuanDisetujuiKabid: (disetujuiSepenuhnyaRes.count ?? 0) + (disetujuiSebagianRes.count ?? 0),
          totalLaporanMonitoring: laporanMonitoringRes.count ?? 0,
        });

      } catch (e: any) {
        console.error("Error in fetchDashboardData:", e);
        setError(e.message || "Gagal memuat data dashboard.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [supabase]);

  // StatCard component definition updated to match kepala-bidang/page.tsx
  interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactElement<React.SVGProps<SVGSVGElement> & { className?: string }>;
    bgColorClass: string; // Changed from iconBgColor
    textColorClass: string; // Changed from iconColor
  }
  const StatCard: React.FC<StatCardProps> = ({ title, value, icon, bgColorClass, textColorClass }) => (
    <div className="p-4 rounded-xl shadow-lg bg-blue-50 dark:bg-slate-800 h-full flex flex-col justify-between transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1"> {/* Changed hover effect slightly */}
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${bgColorClass} bg-opacity-20 dark:bg-opacity-25`}>
          {React.cloneElement(icon, { className: `h-4 w-4 md:h-5 md:w-5 ${textColorClass} transition-transform duration-300` })}
        </div>
      </div>
      <div>
        <h3 className="mt-1 text-lg md:text-xl font-bold text-slate-700 dark:text-slate-50">{value}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-300 truncate" title={title}>{title}</p>
      </div>
    </div>
  );

  // Komponen untuk grafik ringkasan total
  const SummaryTotalChart = ({ data, title, barColor, link }: {
    data: SummaryChartData[];
    title: string;
    barColor: string;
    link?: string;
  }) => {
    if (!data || data.length === 0 || data[0].Jumlah === 0) {
      return (
        <div className="text-center text-slate-500 dark:text-slate-400 h-full flex flex-col justify-center items-center p-6 md:p-8">
          <BarChart3 className="h-12 w-12 md:h-16 md:w-16 text-slate-400 dark:text-slate-500 mb-4" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Data Kosong</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {title.toLowerCase()} belum memiliki data. {link && <Link href={link} className="text-sky-500 hover:underline">Lihat detail</Link>}
          </p>
        </div>
      );
    }
    return (
      <div className="h-full flex flex-col">
        <h3 className="text-sm md:text-base font-semibold text-slate-700 dark:text-slate-200 mb-4 text-center shrink-0 border-b pb-3 border-slate-200 dark:border-slate-700">{title}</h3> {/* Added border */}
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            {/* Changed layout to default (vertical bars) and adjusted margins */}
            <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} className="dark:stroke-slate-700 stroke-slate-200" />
              <XAxis dataKey="name" type="category" fontSize={10} tick={{ fill: 'currentColor' }} className="text-slate-500 dark:text-slate-400" interval={0} angle={-35} textAnchor="end" height={50} />
              <YAxis type="number" allowDecimals={false} fontSize={10} tick={{ fill: 'currentColor' }} className="text-slate-500 dark:text-slate-400" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)', borderRadius: '0.5rem', fontSize: '0.875rem',
                  padding: '0.5rem 0.75rem', borderColor: 'rgba(203, 213, 225, 0.5)',
                  boxShadow: '0 8px 16px -4px rgba(0,0,0,0.1), 0 4px 8px -4px rgba(0,0,0,0.07)', color: '#334155'
                }}
                labelStyle={{ fontWeight: '600', color: '#1e293b', fontSize: '0.9rem', marginBottom: '0.25rem' }} // Show label for category
                itemStyle={{ fontSize: '0.875rem', color: '#475569' }}
                cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
              />
              <Bar dataKey="Jumlah" fill={barColor} name="Total" radius={[4, 4, 0, 0]} barSize={35} /> {/* Adjusted radius and barSize */}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // Helper function to get current month and year string
  const getCurrentMonthYearString = () => {
    const now = new Date();
    const monthName = now.toLocaleString('id-ID', { month: 'long' });
    return `${monthName} ${now.getFullYear()}`;
  };
  return (
    // Applied main background gradient and layout from kepala-bidang page
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-900 dark:to-cyan-950 text-slate-700 dark:text-slate-200">
      {/* Header - Consistent with kepala-bidang page */}
      <header className="bg-white/70 dark:bg-sky-950/70 backdrop-blur-md py-4 shadow-md sticky top-0 z-40 border-b border-sky-300/70 dark:border-sky-800/70">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-xl md:text-2xl font-semibold flex items-center text-sky-700 dark:text-sky-300">
            <Ship className="mr-2.5 h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            Dashboard Kepala Dinas
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6 md:py-8 px-4 md:px-6 flex-1">
        
      {isLoading && (
        <div className="flex-1 flex flex-col justify-center items-center text-slate-600 dark:text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin text-sky-500 mb-3" />
          <p className="text-lg">Memuat data dashboard...</p>
        </div>
      )}

      {!isLoading && error && (
         <div className="flex-1 flex flex-col justify-center items-center bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-400 text-red-700 dark:text-red-300 p-4 rounded-md shadow-md" role="alert">
          <div className="flex items-center">
            <AlertCircle className="h-6 w-6 text-red-500 dark:text-red-400 mr-3 shrink-0" />
            <div>
              <p className="font-bold">Terjadi Kesalahan</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && stats ? (
        <>
          {/* Stats Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8"> {/* Matched gap and margin */}
            <Link href="/kepala-dinas/laporan-pengajuan" className="focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded-xl">
              <StatCard
                title="Total Pengajuan Telah Disetujui"
                value={stats.pengajuanDisetujuiKabid}
                icon={<CheckCircle />}
                bgColorClass="bg-emerald-500" // Base color for icon background
                textColorClass="text-emerald-600 dark:text-emerald-400"
              />
            </Link>
            <Link href="/kepala-dinas/laporan-akhir" className="focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded-xl">
              <StatCard
                title="Total Laporan Monitoring Nelayan"
                value={stats.totalLaporanMonitoring}
                icon={<Users />}
                bgColorClass="bg-sky-500" // Base color for icon background
                textColorClass="text-sky-600 dark:text-sky-400"
              />
            </Link>
          </section>
          
          {/* Summary Total Charts */}
          <section className="mb-6 md:mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <Link href="/kepala-dinas/laporan-pengajuan" className="focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded-xl">
                <section className="p-6 bg-blue-50 dark:bg-slate-800 rounded-xl shadow-lg flex flex-col h-[200px] md:h-[250px]">
                  <SummaryTotalChart
                    data={[{ name: getCurrentMonthYearString(), Jumlah: stats.pengajuanDisetujuiKabid }]}
                    title="Total Pengajuan Disetujui"
                    barColor="#10b981" // emerald-500
                  />
                </section>
              </Link>
              <Link href="/kepala-dinas/laporan-akhir" className="focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded-xl">
                <section className="p-6 bg-blue-50 dark:bg-slate-800 rounded-xl shadow-lg flex flex-col h-[200px] md:h-[250px]">
                  <SummaryTotalChart
                    data={[{ name: getCurrentMonthYearString(), Jumlah: stats.totalLaporanMonitoring }]}
                    title="Total Laporan Monitoring"
                    barColor="#38bdf8" // sky-400
                  />
                </section>
              </Link>
            </div>
          </section>
        </>
      ) : (
        // Fallback if stats is null but no error/loading (e.g., data fetch completed with no data)
        !isLoading && !error && <div className="flex-1 flex justify-center items-center text-slate-500 dark:text-slate-400 p-6">
            <p>Tidak ada data untuk ditampilkan.</p>
        </div>
      )}
      </main>
      {/* Footer - Consistent with kepala-bidang page */}
      <footer className="py-4 text-center text-sm text-slate-500 dark:text-slate-400 border-t border-sky-200 dark:border-sky-700">
      </footer>
    </div>
  );
}