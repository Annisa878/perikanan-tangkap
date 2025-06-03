import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FilePlus2, ClipboardList } from "lucide-react"; // Consolidated imports
import SubmissionStatusChartUser from "@/components/charts/SubmissionStatusChartUser"; // Import the chart component

type ChartDataItemUser = { name: string; jumlah: number; fill: string };

// Helper function to process data for monthly trend
const processMonthlyTrendData = (
  items: { created_at: string }[] | null,
  chartBarColor: string
): ChartDataItemUser[] => {
  if (!items || items.length === 0) {
    return [];
  }

  const monthlyCounts: { [key: string]: number } = {}; // Key: "YYYY-MM"

  items.forEach(item => {
    const date = new Date(item.created_at);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    const key = `${year}-${String(month + 1).padStart(2, '0')}`; // "YYYY-MM"

    monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  // Create intermediate data with numeric year and month for reliable sorting
  const intermediateData = Object.entries(monthlyCounts)
    .map(([yearMonth, jumlah]) => {
      const [yearStr, monthNumStr] = yearMonth.split('-');
      return {
        year: parseInt(yearStr),
        monthIndex: parseInt(monthNumStr) - 1, // 0-11 for month index
        jumlah,
        fill: chartBarColor,
      };
    });

  // Sort the intermediate data
  intermediateData.sort((a, b) => {
    if (a.year !== b.year) {
      return a.year - b.year;
    }
    return a.monthIndex - b.monthIndex;
  });

  // Map to the final chart data structure
  return intermediateData.map(item => ({
    name: `${monthNames[item.monthIndex]} '${String(item.year).slice(-2)}`,
    jumlah: item.jumlah,
    fill: item.fill,
  }));
};

export default async function Dashboard() {
  const supabase = await createClient();
  // Pastikan Supabase Client valid
  if (!supabase || !supabase.auth) {
    console.error("Supabase client tidak valid.");
    redirect("/sign-in");
  }

  // Cek apakah user sudah login
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in");
  }

  // Fetch user data from users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .eq('role', 'user')
    .single();

  if (userError || !userData) {
    redirect("/sign-in");
  }

    // Fetch total pengajuan bantuan for the user
    const { count: totalPengajuanBantuan, error: pengajuanError } = await supabase
      .from('pengajuan')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
  
    // Fetch total laporan monitoring for the user
    const { count: totalLaporanMonitoring, error: laporanError } = await supabase // Assuming 'monitoring' is your table for laporan monitoring
      .from('monitoring') // Assuming 'monitoring' is your table for laporan monitoring
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
  
    // Fetch submission status data for the chart
    const { data: pengajuanStatusData, error: statusError } = await supabase
      .from('pengajuan')
      .select('status_verifikasi')
      .eq('user_id', user.id);
  
    let chartDataUser: ChartDataItemUser[] = [];
    if (pengajuanStatusData) {
      const statusCounts: { [key: string]: number } = {
        Diterima: 0,
        Ditolak: 0,
        Menunggu: 0,
        'Perlu Revisi': 0,
      };
      pengajuanStatusData.forEach((item: { status_verifikasi: string | null }) => {
        const status = item.status_verifikasi || 'Menunggu'; // Default to Menunggu if null
        if (statusCounts.hasOwnProperty(status)) {
          statusCounts[status]++;
        } else {
          // Handle unexpected statuses if necessary, or group them
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        }
      });
      chartDataUser = [
        { name: 'Diterima', jumlah: statusCounts.Diterima, fill: '#34d399' }, // emerald-400 (Sea green)
        { name: 'Ditolak', jumlah: statusCounts.Ditolak, fill: '#fb7185' },   // rose-400 (Soft red)
        { name: 'Menunggu', jumlah: statusCounts.Menunggu, fill: '#60a5fa' }, // blue-400 (Calm blue)
        { name: 'Perlu Revisi', jumlah: statusCounts['Perlu Revisi'], fill: '#facc15' }, // yellow-400 (Bright warning yellow)
      ].filter(item => item.jumlah > 0); // Only include statuses with counts > 0
    }

    // Fetch and process data for Pengajuan History Chart
    const { data: pengajuanHistoryRaw, error: pengajuanHistoryError } = await supabase
      .from('pengajuan')
      .select('created_at')
      .eq('user_id', user.id);
    const chartDataPengajuanHistory = processMonthlyTrendData(pengajuanHistoryRaw, '#3b82f6'); // blue-500

    // Fetch and process data for Monitoring History Chart
    const { data: monitoringHistoryRaw, error: monitoringHistoryError } = await supabase
      .from('monitoring') // Assuming 'monitoring' is your table for laporan monitoring
      .select('created_at') // Assuming 'created_at' is the submission date of the report
      .eq('user_id', user.id);
    const chartDataMonitoringHistory = processMonthlyTrendData(monitoringHistoryRaw, '#2dd4bf'); // teal-400
  
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-sky-100 to-cyan-100 dark:from-slate-800 dark:to-sky-900">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 via-cyan-400 to-sky-300 dark:from-teal-700 dark:via-cyan-600 dark:to-sky-500 py-8 px-4 shadow-lg">
          {/* Konten header bisa disesuaikan atau dikosongkan jika tidak ada judul lain */}
          <h1 className="text-3xl md:text-4xl font-bold text-white">Dashboard Pengguna</h1>
        </div>
  
        {/* Main Content */}
        <div className="container mx-auto py-8 px-4 flex-grow">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <StatCardUser
              title="Total Pengajuan Bantuan"
              value={totalPengajuanBantuan || 0}
              icon={<FilePlus2 className="w-10 h-10 text-sky-600 dark:text-sky-400" />}
              bgColor="bg-sky-100 dark:bg-sky-800/50"
            />
            <StatCardUser
              title="Total Laporan Monitoring"
              value={totalLaporanMonitoring || 0}
              icon={<ClipboardList className="w-10 h-10 text-teal-600 dark:text-teal-400" />}
              bgColor="bg-teal-100 dark:bg-teal-800/50"
            />
          </div>
  
          {/* Combined Chart Section for Pengajuan and Monitoring History */}
          {(chartDataPengajuanHistory.length > 0 || chartDataMonitoringHistory.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Chart Section - Riwayat Pengajuan (Bulanan) */}
              {chartDataPengajuanHistory.length > 0 && (
                <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                  <SubmissionStatusChartUser data={chartDataPengajuanHistory} />
                </div>
              )}

              {/* Chart Section - Riwayat Laporan Monitoring (Bulanan) */}
              {chartDataMonitoringHistory.length > 0 && (
                <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                  <SubmissionStatusChartUser data={chartDataMonitoringHistory} />
                </div>
              )}
            </div>
          )}
  
          {/* Bagian Action Cards telah dihapus */}
          {/* Anda bisa menambahkan konten lain di sini jika diperlukan */}
        </div>
    </div>
    );
  }
  
  // StatCardUser component for displaying individual stats
  const StatCardUser = ({ title, value, icon, bgColor }: { title: string; value: string | number; icon: React.ReactNode; bgColor: string }) => (
    <div className={`rounded-xl shadow-lg p-6 flex items-center space-x-6 ${bgColor}`}>
      <div className="flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{title}</p>
        <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
      </div>
    </div>
  );
  
  
  const DashboardCard = ({ title, description, link, buttonText, buttonStyle }: {
    title: string;
    description: string;
    link: string;
    buttonText: string;
    buttonStyle: string;
  }) => ( // Using the more styled version
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 flex flex-col justify-between transition-all hover:shadow-2xl hover:-translate-y-1">
      <div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">{title}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{description}</p>
      </div>
      <Link
        href={link}
        className={`block w-full ${buttonStyle} font-medium py-2.5 px-4 rounded-lg text-center transition duration-200`}
      >
        {buttonText}
      </Link>
    </div>
  );
