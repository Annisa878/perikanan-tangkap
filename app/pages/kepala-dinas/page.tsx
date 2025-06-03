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
  BarChart3, Loader2, // Ditambahkan Loader2
  AlertCircle,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  pengajuanMenungguVerifikasiKabid: number;
  pengajuanDisetujuiKabid: number;
  totalLaporanMonitoring: number;
}
interface MonthlyData {
  month: string;
  jumlah: number;
}

const KABID_APPROVED_MONITORING_STATUS = 'Disetujui'; // Status yang sama dengan di halaman laporan-akhir

// Fungsi helper untuk memproses data menjadi tren bulanan
const processDataForMonthlyTrend = (items: { created_at: string }[] | null | undefined): MonthlyData[] => {
  if (!items || items.length === 0) return [];
  const countsByMonthYear: Record<string, number> = {};

  items.forEach(item => {
    if (item.created_at) { // Tambahkan pemeriksaan null/undefined
      const date = new Date(item.created_at);
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11
      const key = `${year}-${String(month).padStart(2, '0')}`; // Format YYYY-MM untuk sorting
      countsByMonthYear[key] = (countsByMonthYear[key] || 0) + 1;
    }
  });

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  return Object.keys(countsByMonthYear)
    .sort() // Sortir berdasarkan YYYY-MM
    .map(key => {
      const [year, monthNum] = key.split('-');
      return {
        month: `${monthLabels[parseInt(monthNum, 10)]} ${year}`,
        jumlah: countsByMonthYear[key],
      };
    });
};

export default function KepalaDinasDashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<DashboardStats | null>(null); // Tetap null hingga data dimuat
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pengajuanTrendData, setPengajuanTrendData] = useState<MonthlyData[]>([]);
  const [monitoringTrendData, setMonitoringTrendData] = useState<MonthlyData[]>([]);

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
          pengajuanTrendRawRes,
          monitoringTrendRawRes,
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
          // Queries for chart data
          supabase
            .from('pengajuan')
            .select('created_at')
            .in('status_verifikasi_kabid', ['Disetujui Sepenuhnya', 'Disetujui Sebagian']),
          supabase
            .from('monitoring')
            .select('created_at'),
        ]);

        // Consolidate error checking after all promises
        const allErrors = [
          menungguKabidRes.error, 
          disetujuiSepenuhnyaRes.error, 
          disetujuiSebagianRes.error, 
          laporanMonitoringRes.error,
          pengajuanTrendRawRes.error,
          monitoringTrendRawRes.error
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

        // Process and set chart data
        const pengajuanDataForChart = processDataForMonthlyTrend(pengajuanTrendRawRes.data);
        const monitoringDataForChart = processDataForMonthlyTrend(monitoringTrendRawRes.data);
        
        setPengajuanTrendData(pengajuanDataForChart);
        setMonitoringTrendData(monitoringDataForChart);

      } catch (e: any) {
        console.error("Error in fetchDashboardData:", e);
        setError(e.message || "Gagal memuat data dashboard.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [supabase]);

  const StatCard = ({ title, value, icon, iconBgColor, iconColor, link }: {
    title: string;
    value: string | number;
    icon: React.ReactElement<React.SVGAttributes<SVGSVGElement>>;
    iconBgColor: string;
    iconColor: string;
    link?: string;
  }) => {
    const cardContent = (
      <div className="bg-white dark:bg-slate-800/70 p-4 md:p-5 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out flex items-center space-x-4 border border-slate-200 dark:border-slate-700/50">
        <div className={`p-3 rounded-full ${iconBgColor}`}>
          {React.cloneElement(icon, { className: `h-6 w-6 md:h-7 md:w-7 ${iconColor}` })}
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium truncate" title={title}>{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">{value}</p>
        </div>
      </div>
    );

    return link ? (
      <Link href={link} className="focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded-xl">{cardContent}</Link>
    ) : cardContent;
  };

  // Komponen untuk grafik tren
  const TrendChart = ({ data, title, barColor, dataKey }: { data: MonthlyData[]; title: string; barColor: string; dataKey: string; }) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center text-slate-500 dark:text-slate-400 h-full flex flex-col justify-center items-center p-6 md:p-8">
          <BarChart3 className="h-12 w-12 md:h-16 md:w-16 text-slate-400 dark:text-slate-500 mb-4" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Data Belum Cukup</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">untuk menampilkan {title.toLowerCase()}.</p>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col"> {/* Chart takes full height of its parent */}
        <h3 className="text-sm md:text-base font-semibold text-slate-700 dark:text-slate-200 mb-3 text-center shrink-0">{title}</h3>
        <div className="flex-1 min-h-0"> {/* This div allows ResponsiveContainer to expand */}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} className="dark:stroke-slate-700 stroke-slate-200" />
              <XAxis dataKey="month" fontSize={10} interval={0} angle={-35} textAnchor="end" height={50} tick={{ fill: 'currentColor' }} className="text-slate-500 dark:text-slate-400" tickMargin={5} />
              <YAxis allowDecimals={false} fontSize={10} tick={{ fill: 'currentColor' }} className="text-slate-500 dark:text-slate-400" tickMargin={5}/>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  padding: '0.5rem 0.75rem',
                  borderColor: 'rgba(203, 213, 225, 0.5)',
                  boxShadow: '0 8px 16px -4px rgba(0,0,0,0.1), 0 4px 8px -4px rgba(0,0,0,0.07)',
                  color: '#334155'
                }}
                labelStyle={{ fontWeight: '600', color: '#1e293b', fontSize: '0.9rem', marginBottom: '0.25rem' }}
                itemStyle={{ fontSize: '0.875rem', color: '#475569' }}
                cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '0.8rem', paddingBottom: '10px' }} />
              <Bar dataKey={dataKey} fill={barColor} name="Jumlah" radius={[4, 4, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-3 md:p-4 bg-sky-50 dark:bg-slate-900 h-screen overflow-y-auto flex flex-col">
      <header className="mb-4 md:mb-6 shrink-0">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
          <LayoutDashboard className="mr-2.5 h-6 w-6 md:h-7 md:w-7 text-sky-600 dark:text-sky-400" />
          Dashboard Kepala Dinas
        </h1>
      </header>

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
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 mb-4 md:mb-6 shrink-0">
            <StatCard
              title="Total Pengajuan Telah Disetujui"
              value={stats.pengajuanDisetujuiKabid}
              icon={<CheckCircle />}
              iconBgColor="bg-emerald-100 dark:bg-emerald-500/20"
              iconColor="text-emerald-600 dark:text-emerald-400"
              link="/kepala-dinas/laporan-pengajuan"
            />
            <StatCard
              title="Total Laporan Monitoring Nelayan"
              value={stats.totalLaporanMonitoring}
              icon={<Users />}
              iconBgColor="bg-sky-100 dark:bg-sky-500/20"
              iconColor="text-sky-600 dark:text-sky-400"
              link="/kepala-dinas/laporan-akhir"
            />
          </section>
          
          {/* Charts/Visualizations - This section will take the remaining vertical space */}
          <section className="flex-1 flex flex-col min-h-0"> {/* flex-1 and min-h-0 are crucial */}
            <h2 className="text-lg md:text-xl font-semibold text-slate-700 dark:text-slate-200 mb-3 md:mb-4 shrink-0">Statistik Utama</h2>
            
            {/* This div will contain the actual chart components and must fill its parent */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 min-h-0">
                {(pengajuanTrendData.length > 0 || monitoringTrendData.length > 0) ? (
                  <>
                    {/* Each chart item wrapper needs to be flex-col for TrendChart to work */}
                    <div className="bg-white dark:bg-slate-800/70 p-4 md:p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700/50 flex flex-col">
                      <TrendChart data={pengajuanTrendData} title="Tren Pengajuan Disetujui" barColor="#10b981" dataKey="jumlah" /> {/* emerald-500 */}
                    </div>
                    <div className="bg-white dark:bg-slate-800/70 p-4 md:p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700/50 flex flex-col">
                      <TrendChart data={monitoringTrendData} title="Tren Laporan Monitoring" barColor="#38bdf8" dataKey="jumlah" /> {/* sky-400 */}
                    </div>
                  </>
                ) : (
                  // Placeholder if no chart data, should span both columns in lg view and fill height
                  <div className="lg:col-span-2 bg-white dark:bg-slate-800/70 p-4 md:p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700/50 text-center flex flex-col justify-center items-center h-full min-h-[200px]">
                      <BarChart3 className="h-12 w-12 md:h-16 md:w-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                      <h3 className="text-base md:text-lg font-semibold text-slate-700 dark:text-slate-300">Belum Ada Data Grafik</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          Data tren akan muncul di sini setelah ada aktivitas.
                      </p>
                  </div>
                )}
            </div>
          </section>
        </>
      ) : (
        // Fallback if stats is null but no error/loading (e.g., data fetch completed with no data)
        !isLoading && !error && <div className="flex-1 flex justify-center items-center text-slate-500 dark:text-slate-400">
            <p>Tidak ada data untuk ditampilkan.</p>
        </div>
      )}
    </div>
  );
}