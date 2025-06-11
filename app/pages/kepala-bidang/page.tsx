import { createClient } from "@/utils/supabase/server"; // Changed to server client
import { redirect } from "next/navigation";
import Link from "next/link";
import PengajuanStatusChart from "@/app/components/kepala-bidang/PengajuanStatusChart"; // Assuming this is the correct path
import {
  LayoutDashboard,  
  FileClock, // For Menunggu
  CheckCircle2, // For Diterima
  XCircle, // For Ditolak
  Ship, // Icon tambahan untuk tema kelautan
} from "lucide-react";
import React from "react";
 
export default async function KepalaBidangDashboardPage() { // Renamed and made async for server component
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in");
  }

  // Fetch user's role from the 'users' table
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('role, username')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile) {
    console.error("Error fetching user profile for Kepala Bidang:", profileError);
    // Optionally redirect to an error page or sign-in
    redirect("/sign-in?message=Error loading profile");
  }

  if (userProfile.role !== 'kepala bidang') {
    // Redirect if not Kepala Bidang, perhaps to a generic dashboard or sign-in
    redirect("/?message=Access Denied"); 
  }

  // Fetch counts for dashboard cards and chart
  const fetchCounts = async () => {
    const [menungguRes, diterimaRes, ditolakRes] = await Promise.all([
      supabase
        .from('pengajuan')
        .select('id_pengajuan', { count: 'exact', head: true })
        .eq('status_verifikasi', 'Diterima') // Telah diverifikasi admin
        .or('status_verifikasi_kabid.is.null,status_verifikasi_kabid.eq.Menunggu'), // Menunggu keputusan Kabid
      supabase
        .from('pengajuan')
        .select('id_pengajuan', { count: 'exact', head: true })
        .in('status_verifikasi_kabid', ['Disetujui Sepenuhnya', 'Disetujui Sebagian']),
      supabase
        .from('pengajuan')
        .select('id_pengajuan', { count: 'exact', head: true })
        .eq('status_verifikasi_kabid', 'Ditolak')
    ]);

    const errors = [menungguRes.error, diterimaRes.error, ditolakRes.error].filter(Boolean);
    if (errors.length > 0) {
      console.error("Error fetching counts for Kepala Bidang dashboard:", errors);
      // Return default counts or throw an error to be caught by an error boundary
      return { menungguCount: 0, diterimaCount: 0, ditolakCount: 0, error: "Failed to load some statistics." };
    }

    return {
      menungguCount: menungguRes.count ?? 0,
      diterimaCount: diterimaRes.count ?? 0,
      ditolakCount: ditolakRes.count ?? 0,
      error: null,
    };
  };

  const { menungguCount, diterimaCount, ditolakCount, error: countError } = await fetchCounts();

  // Data untuk chart terpisah
  const diterimaChartData = [
    { name: 'Diterima Anda', Jumlah: diterimaCount, fill: 'var(--chart-green)' }, // Warna bisa disesuaikan di komponen chart
  ];

  const ditolakChartData = [
    { name: 'Ditolak Anda', Jumlah: ditolakCount, fill: 'var(--chart-red)' }, // Warna bisa disesuaikan di komponen chart
  ];
  
  
  // Define the props for StatCard
  interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactElement<React.SVGProps<SVGSVGElement> & { className?: string }>; // Allow className on icon
    bgColorClass: string;
    textColorClass: string;
    // link: string; // Link prop removed
  }
  const StatCard: React.FC<StatCardProps> = ({ title, value, icon, bgColorClass, textColorClass }) => (
    // Applied themed card styling from monitoring/user pages
    <div className="p-3 rounded-lg shadow-md bg-blue-50 dark:bg-slate-800 h-full flex flex-col justify-between transition-all duration-200 ease-in-out hover:shadow-lg hover:scale-[1.01]">
      <div className="flex items-start justify-between mb-2"> {/* Reduced margin-bottom from mb-4 to mb-2 */}
        <div className={`p-1 rounded-lg ${bgColorClass} bg-opacity-20 dark:bg-opacity-25`}> {/* Reduced padding for icon background from p-2 to p-1 */}
          {React.cloneElement(icon, { className: `h-4 w-4 md:h-5 md:w-5 ${textColorClass} transition-transform duration-300` })} {/* Reduced icon size */}
        </div>
      </div>
      <div>
        <h3 className="mt-1 text-lg md:text-xl font-bold text-slate-700 dark:text-slate-50">{value}</h3> {/* Reduced margin-top and font size for value */}
        <p className="text-xs text-slate-500 dark:text-slate-300 truncate" title={title}>{title}</p> {/* Reduced font size for title, removed md:text-sm */}
      </div>
    </div>
  );

  return (
    // Applied main background gradient from monitoring page
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-900 dark:to-cyan-950 text-slate-700 dark:text-slate-200">
      {/* Header */}
      {/* Kept sticky header structure but adjusted colors */}
      <header className="bg-white/70 dark:bg-sky-950/70 backdrop-blur-md py-4 shadow-md sticky top-0 z-40 border-b border-sky-300/70 dark:border-sky-800/70">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-xl md:text-2xl font-semibold flex items-center text-sky-700 dark:text-sky-300">
            <Ship className="mr-2.5 h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            Dashboard Kepala Bidang
          </div>
        </div>
      </header>            
      {/* Main Content */}
      <main className="container mx-auto py-6 md:py-8 px-4 md:px-6 flex-1">
        {countError && (
          <div className="mb-6 p-4 text-sm text-red-700 bg-red-100 border-red-300 dark:text-red-300 dark:bg-red-700/30 dark:border-red-600 rounded-lg" role="alert">
            <span className="font-medium">Error!</span> {countError}
          </div>
        )}

        {/* Main Page Title was in the header, h1 below can be removed or repurposed if needed for other section titles */}

        {/* Stats Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <StatCard
            title="Pengajuan Menunggu Verifikasi"
            value={menungguCount}
            icon={<FileClock />}
            bgColorClass="bg-amber-400" 
            textColorClass="text-amber-500 dark:text-amber-400"
            // link="/kepala-bidang/verifikasi-pengajuan?status_filter=Belum%20Diverifikasi" // Link removed
          />
          <StatCard
            title="Pengajuan Diterima Anda"
            value={diterimaCount}
            icon={<CheckCircle2 />}
            bgColorClass="bg-green-400"
            textColorClass="text-green-500 dark:text-green-400"
            // link="/kepala-bidang/verifikasi-pengajuan?status_filter=Disetujui"  // Link removed
          />
          <StatCard
            title="Pengajuan Ditolak Anda"
            value={ditolakCount}
            icon={<XCircle />}
            bgColorClass="bg-red-400"
            textColorClass="text-red-500 dark:text-red-400"
            // link="/kepala-bidang/verifikasi-pengajuan?status_filter=Ditolak" // Link removed
          />
        </section>
        
        {/* Chart Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Applied themed chart container styling */}
          <section className="p-6 bg-blue-50 dark:bg-slate-800 rounded-xl shadow-lg">
            <h2 className="text-lg font-medium text-slate-700 dark:text-slate-100 mb-4 text-center md:text-left">
              Pengajuan Diterima Anda
            </h2>
            <div className="h-[140px] md:h-[180px]"> {/* Further reduced height */}
              <PengajuanStatusChart data={diterimaChartData} />
            </div>
          </section>

          {/* Applied themed chart container styling */} {/* Removed the extra section tag */}
          <section className="p-6 bg-blue-50 dark:bg-slate-800 rounded-xl shadow-lg">
            <h2 className="text-lg font-medium text-slate-700 dark:text-slate-100 mb-4 text-center md:text-left">
              Pengajuan Ditolak Anda
            </h2>
            <div className="h-[140px] md:h-[180px]"> {/* Further reduced height */}
              <PengajuanStatusChart data={ditolakChartData} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}