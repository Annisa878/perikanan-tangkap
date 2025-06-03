import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminDashboardCharts, { MonthlyData } from "@/app/components/admin/AdminDashboardCharts";
import {
  Users,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();
  
  // Check if admin is authenticated
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect("/sign-in");
  }
  
  // Fetch admin data from users table
  const { data: adminData, error: adminError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .eq('role', 'admin')
    .single();
  
  if (!adminData) {
    redirect("/sign-in");
  }

  // Fetch counts
  const { count: totalUsersCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  const { count: totalPengajuanCount } = await supabase
    .from('pengajuan')
    .select('*', { count: 'exact', head: true });

  const { count: pengajuanMenungguCount } = await supabase
    .from('pengajuan')
    .select('*', { count: 'exact', head: true })
    .eq('status_verifikasi', 'Menunggu');

  const { count: pengajuanDiterimaCount } = await supabase
    .from('pengajuan')
    .select('*', { count: 'exact', head: true })
    .eq('status_verifikasi', 'Diterima');

  const { count: pengajuanDitolakCount } = await supabase
    .from('pengajuan')
    .select('*', { count: 'exact', head: true })
    .eq('status_verifikasi', 'Ditolak');

  // Fetch data for charts
  const { data: allPengajuanData, error: allPengajuanError } = await supabase
    .from('pengajuan')
    .select('created_at, status_verifikasi');

  // Helper function to process data for monthly trend (server-side)
  const processDataForMonthlyTrendServer = (
    items: { created_at: string; status_verifikasi: string | null }[] | null,
    targetStatus: 'Diterima' | 'Ditolak'
  ): MonthlyData[] => {
    if (!items || items.length === 0) {
      return [];
    }

    const monthlyCounts: { [key: string]: number } = {}; // Key: "YYYY-MM"

    items.forEach(item => {
      if (item.status_verifikasi === targetStatus) {
        const date = new Date(item.created_at);
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-11
        const key = `${year}-${String(month + 1).padStart(2, '0')}`; // "YYYY-MM"

        if (!monthlyCounts[key]) {
          monthlyCounts[key] = 0;
        }
        monthlyCounts[key]++;
      }
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

    return Object.entries(monthlyCounts)
      .map(([yearMonth, jumlah]) => {
        const [year, monthNum] = yearMonth.split('-');
        return {
          year: parseInt(year),
          monthIndex: parseInt(monthNum) - 1, // 0-11
          month: `${monthNames[parseInt(monthNum) - 1]} ${year}`,
          jumlah,
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) {
          return a.year - b.year;
        }
        return a.monthIndex - b.monthIndex;
      })
      .map(({ month, jumlah }) => ({ month, jumlah }));
  };

  const pengajuanDiterimaTrend = processDataForMonthlyTrendServer(allPengajuanData, 'Diterima');
  const pengajuanDitolakTrend = processDataForMonthlyTrendServer(allPengajuanData, 'Ditolak');

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-sky-100 dark:bg-gradient-to-b dark:from-slate-900 dark:to-sky-800"> {/* Gradient background white to sea color */}
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-cyan-500 dark:from-sky-700 dark:to-cyan-700 py-6 shadow-md"> {/* Reduced padding and shadow for a slimmer look */}
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-semibold text-white"> {/* Adjusted font size for slimmer header */}
            Admin Dashboard
          </h1>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto py-8 px-4 flex-grow">
        {/* Empty Welcome Card removed for a cleaner look */}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard 
            title="Total Pengguna" 
            value={totalUsersCount || 0} 
            icon={<Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />} 
            iconBgColor="bg-blue-100 dark:bg-blue-900" 
          />
          <StatCard 
            title="Total Pengajuan" 
            value={totalPengajuanCount || 0} 
            icon={<FileText className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />} 
            iconBgColor="bg-cyan-100 dark:bg-cyan-900"
          />
          <StatCard 
            title="Pengajuan Menunggu" 
            value={pengajuanMenungguCount || 0} 
            icon={<Clock className="w-8 h-8 text-amber-500 dark:text-amber-400" />} 
            iconBgColor="bg-amber-100 dark:bg-amber-800" 
          />
          <StatCard 
            title="Pengajuan Diterima" 
            value={pengajuanDiterimaCount || 0} 
            icon={<CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />} 
            iconBgColor="bg-emerald-100 dark:bg-emerald-800" 
          />
          <StatCard 
            title="Pengajuan Ditolak" 
            value={pengajuanDitolakCount || 0} 
            icon={<XCircle className="w-8 h-8 text-rose-500 dark:text-rose-400" />} 
            iconBgColor="bg-rose-100 dark:bg-rose-800" 
          />
        </div>

        {/* Charts Section */}
        <div className="mb-8">
          <AdminDashboardCharts
            pengajuanDiterimaTrend={pengajuanDiterimaTrend}
            pengajuanDitolakTrend={pengajuanDitolakTrend}
            // Catatan: Untuk konsistensi tema penuh, warna bar di dalam AdminDashboardCharts.tsx
            // juga perlu disesuaikan (misalnya, emerald-500 untuk diterima, rose-500 untuk ditolak).
          />
        </div>
        
        {/* Action Links telah dihapus sesuai permintaan */}
      </div>
    </div>
  );
}

const StatCard = ({ 
  title, 
  value, 
  icon, 
  iconBgColor 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  iconBgColor: string; 
}) => (
  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 flex items-center space-x-4"> {/* Card background */}
    <div className={`p-3 rounded-full ${iconBgColor}`}> {/* Icon background color */}
      {icon}
    </div>
    <div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p> {/* Adjusted text color */}
      <p className="text-2xl font-semibold text-slate-700 dark:text-slate-100">{value}</p> {/* Adjusted text color */}
    </div>
  </div>
);

const ActionCard = ({ title, description, link, bgColor }: { title: string; description: string; link: string; bgColor: string }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col justify-between">
    <div>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h2>
      <p className="mt-2 mb-4 text-gray-600 dark:text-gray-300">{description}</p>
    </div>
    <Link
      href={link}
      className={`block w-full ${bgColor} text-white font-medium py-2.5 px-4 rounded text-center transition duration-200`}
    >
      {title}
    </Link>
  </div>
);