import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import React from "react";
import Link from "next/link";
import AdminDashboardCharts, { MonthlyData } from "@/app/components/admin/AdminDashboardCharts";
import {
  Users,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Ship,
} from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/sign-in");

  const { data: adminData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .eq("role", "admin")
    .single();

  if (!adminData) redirect("/sign-in");

  const { count: totalUsersCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });
  const { count: totalPengajuanCount } = await supabase
    .from("pengajuan")
    .select("*", { count: "exact", head: true });
  const { count: pengajuanMenungguCount } = await supabase
    .from("pengajuan")
    .select("*", { count: "exact", head: true })
    .eq("status_verifikasi", "Menunggu");
  const { count: pengajuanDiterimaCount } = await supabase
    .from("pengajuan")
    .select("*", { count: "exact", head: true })
    .eq("status_verifikasi", "Diterima");
  const { count: pengajuanDitolakCount } = await supabase
    .from("pengajuan")
    .select("*", { count: "exact", head: true })
    .eq("status_verifikasi", "Ditolak");

  const { data: allPengajuanData } = await supabase
    .from("pengajuan")
    .select("created_at, status_verifikasi");

  const processDataForMonthlyTrendServer = (
    items: { created_at: string; status_verifikasi: string | null }[] | null,
    targetStatus: "Diterima" | "Ditolak"
  ): MonthlyData[] => {
    if (!items || items.length === 0) return [];
    const monthlyCounts: { [key: string]: number } = {};
    items.forEach((item) => {
      if (item.status_verifikasi === targetStatus) {
        const date = new Date(item.created_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
      }
    });
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    return Object.entries(monthlyCounts)
      .map(([yearMonth, jumlah]) => {
        const [year, monthNum] = yearMonth.split("-");
        return {
          year: parseInt(year),
          monthIndex: parseInt(monthNum) - 1,
          month: `${monthNames[parseInt(monthNum) - 1]} ${year}`,
          jumlah,
        };
      })
      .sort((a, b) => a.year - b.year || a.monthIndex - b.monthIndex)
      .map(({ month, jumlah }) => ({ month, jumlah }));
  };

  const pengajuanDiterimaTrend = processDataForMonthlyTrendServer(allPengajuanData, "Diterima");
  const pengajuanDitolakTrend = processDataForMonthlyTrendServer(allPengajuanData, "Ditolak");

  return (
    <div className="min-h-screen bg-gradient-to-tr from-cyan-100 via-white to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-slate-800 dark:text-slate-200">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-900/80 border-b border-slate-300 dark:border-slate-700 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold text-cyan-700 dark:text-cyan-400">
            <Ship className="w-6 h-6" />
            Admin Dashboard
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard title="Total Pengguna" value={totalUsersCount || 0} icon={<Users />} color="cyan" />
          <StatCard title="Total Pengajuan" value={totalPengajuanCount || 0} icon={<FileText />} color="teal" />
          <StatCard title="Menunggu" value={pengajuanMenungguCount || 0} icon={<Clock />} color="orange" />
          <StatCard title="Diterima" value={pengajuanDiterimaCount || 0} icon={<CheckCircle2 />} color="sky" />
          <StatCard title="Ditolak" value={pengajuanDitolakCount || 0} icon={<XCircle />} color="rose" />
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Statistik Pengajuan Bulanan</h2>
          <AdminDashboardCharts
            pengajuanDiterimaTrend={pengajuanDiterimaTrend}
            pengajuanDitolakTrend={pengajuanDitolakTrend}
          />
        </section>
      </main>

      <footer className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        &copy; {new Date().getFullYear()} Admin Panel. All rights reserved.
      </footer>
    </div>
  );
}

const StatCard = ({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactElement<React.SVGProps<SVGSVGElement> & { className?: string }>;
  color: string;
}) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 flex flex-col justify-between hover:shadow-lg transition duration-300 ease-in-out">
    <div className={`p-2 rounded-md bg-${color}-100 dark:bg-${color}-900 bg-opacity-30 mb-2 w-fit`}>
      {React.cloneElement(icon, { className: `w-5 h-5 text-${color}-600 dark:text-${color}-300` })}
    </div>
    <div>
      <h3 className="text-xl font-bold">{value}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300">{title}</p>
    </div>
  </div>
);
