import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import React from "react"; // Ditambahkan untuk mengatasi error TS2686
import AdminDashboardCharts from "@/app/components/admin/AdminDashboardCharts";
import {
  // Icons from lucide-react
  Users,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Ship, // Ditambahkan untuk konsistensi header
} from "lucide-react";
import { processDataForMonthlyTrend, MonthlyData } from "@/utils/data-processing"; // Import from utils

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
    .eq('role', 'Admin Provinsi')
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

  // Process data for charts using the utility function
  // Filter data by status_verifikasi before passing to processDataForMonthlyTrend
  const pengajuanDiterimaTrend = processDataForMonthlyTrend(allPengajuanData?.filter(p => p.status_verifikasi === 'Diterima') || []);
  const pengajuanDitolakTrend = processDataForMonthlyTrend(allPengajuanData?.filter(p => p.status_verifikasi === 'Ditolak') || []);

  return (
    // Mengadopsi layout utama dan latar belakang dari halaman kepala-dinas
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-900 dark:to-cyan-950 text-slate-700 dark:text-slate-200">
      {/* Header */}
      {/* Header disesuaikan dengan gaya kepala-dinas (sticky, backdrop-blur) */}
      <header className="bg-white/70 dark:bg-sky-950/70 backdrop-blur-md py-4 shadow-md sticky top-0 z-40 border-b border-sky-300/70 dark:border-sky-800/70">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-xl md:text-2xl font-semibold flex items-center text-sky-700 dark:text-sky-300">
            <Ship className="mr-2.5 h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            Dashboard Admin
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      {/* Kontainer konten utama disesuaikan */}
      <main className="container mx-auto py-4 md:py-6 px-4 md:px-6 flex-1"> {/* Mengurangi padding vertikal */}
        
        {/* Stats Cards */}
        {/* Menggunakan gap dan margin yang konsisten dengan halaman kepala-dinas */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-4 md:mb-6"> {/* Mengurangi margin bawah */}
          <StatCard 
            title="Total Pengguna" 
            value={totalUsersCount || 0} 
            icon={<Users />} 
            bgColorClass="bg-sky-500" 
            textColorClass="text-sky-600 dark:text-sky-400"
          />
          <StatCard 
            title="Total Pengajuan" 
            value={totalPengajuanCount || 0} 
            icon={<FileText />} 
            bgColorClass="bg-teal-500" // Menggunakan prop yang sesuai
            textColorClass="text-teal-500 dark:text-teal-300"
          />
          <StatCard 
            title="Pengajuan Menunggu" 
            value={pengajuanMenungguCount || 0} 
            icon={<Clock />} 
            bgColorClass="bg-cyan-500" 
            textColorClass="text-cyan-600 dark:text-cyan-400"
          />
          <StatCard 
            title="Pengajuan Diterima" 
            value={pengajuanDiterimaCount || 0} 
            icon={<CheckCircle2 />} 
            bgColorClass="bg-blue-500"
            textColorClass="text-blue-600 dark:text-blue-400"
          />
          <StatCard 
            title="Pengajuan Ditolak" 
            value={pengajuanDitolakCount || 0} 
            icon={<XCircle />} 
            bgColorClass="bg-slate-500"
            textColorClass="text-slate-600 dark:text-slate-400"
          />
        </section>

        {/* Charts Section */}
        <div className="mb-4"> {/* Mengurangi margin bawah */}
          <AdminDashboardCharts
            pengajuanDiterimaTrend={pengajuanDiterimaTrend}
            pengajuanDitolakTrend={pengajuanDitolakTrend} 
            // Catatan: Untuk konsistensi tema kelautan penuh, warna bar di dalam AdminDashboardCharts.tsx
            // juga perlu disesuaikan (misalnya, emerald-500 untuk diterima, rose-500 untuk ditolak).
          />
        </div>
        
      </main>
      {/* Footer - Ditambahkan untuk konsistensi */}
      <footer className="py-4 text-center text-sm text-slate-500 dark:text-slate-400 border-t border-sky-200 dark:border-sky-700">
        
      </footer>
    </div>
  );
}

// Definisi StatCard disesuaikan dengan yang ada di kepala-dinas/page.tsx
// Props: title, value, icon, bgColorClass, textColorClass
const StatCard = ({ 
  title, 
  value, 
  icon, 
  bgColorClass,
  textColorClass
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactElement<React.SVGProps<SVGSVGElement> & { className?: string }>; // Memperbolehkan className pada ikon
  bgColorClass: string;
  textColorClass: string;
}) => (
  
  <div className="p-2 rounded-md shadow-sm bg-blue-50 dark:bg-slate-800 h-full flex flex-col justify-between transition-all duration-300 ease-in-out hover:shadow-md hover:scale-[1.02]"> {/* Padding, shadow, scale lebih kecil */}
    <div className="flex items-start justify-between mb-1"> {/* Margin bawah dikurangi */}
      <div className={`p-1 rounded-md ${bgColorClass} bg-opacity-20 dark:bg-opacity-25`}> {/* Padding ikon dikurangi, rounded-md */}
        {React.cloneElement(icon, { className: `h-3.5 w-3.5 ${textColorClass} transition-transform duration-300` })} {/* Ukuran ikon lebih kecil */}
      </div>
    </div>
    <div>
      <h3 className="mt-0.5 text-sm md:text-base font-bold text-slate-700 dark:text-slate-50">{value}</h3> {/* Margin atas dan font value lebih kecil */}
      <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate" title={title}>{title}</p> {/* Font title lebih kecil (custom size) */}
    </div>
  </div>
);

// Komponen ActionCard tidak digunakan di halaman kepala-dinas, jadi bisa dipertimbangkan untuk dihapus jika tidak relevan lagi.
// Untuk saat ini, saya biarkan karena tidak ada instruksi eksplisit untuk menghapusnya.