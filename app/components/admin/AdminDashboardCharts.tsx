"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export interface MonthlyData {
  month: string;
  jumlah: number;
}

// Fungsi helper ini bisa juga dipindahkan ke file utilitas bersama jika digunakan di banyak tempat
export const processDataForMonthlyTrend = (items: { created_at: string }[] | null | undefined): MonthlyData[] => {
  if (!items || items.length === 0) return [];

  const countsByMonthYear: Record<string, number> = {};
  items.forEach(item => {
    const date = new Date(item.created_at);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    const key = `${year}-${String(month).padStart(2, '0')}`; 
    countsByMonthYear[key] = (countsByMonthYear[key] || 0) + 1;
  });

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  return Object.keys(countsByMonthYear)
    .sort()
    .map(key => {
      const [year, monthNum] = key.split('-');
      return {
        month: `${monthLabels[parseInt(monthNum, 10)]} ${year}`,
        jumlah: countsByMonthYear[key],
      };
    });
};

interface TrendChartProps {
  data: MonthlyData[];
  title: string;
  barColor: string;
  gradientColor?: string;
  dataKey: string;
  barSize?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 p-3 rounded-lg">
        <p className="font-semibold text-gray-800 dark:text-gray-100">{label}</p>
        <p className="text-sm mt-1">
          <span className="font-medium">Jumlah:</span>{" "}
          <span className="font-semibold text-blue-600 dark:text-blue-400">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

const NoDataDisplay = ({ title }: { title: string }) => (
  <div className="h-full flex flex-col justify-center items-center p-6 text-center">
    <div className="w-16 h-16 mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    </div>
    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Belum Ada Data</h3>
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      Data {title.toLowerCase()} akan ditampilkan di sini ketika tersedia.
    </p>
  </div>
);

const TrendChart: React.FC<TrendChartProps> = ({ 
  data, 
  title, 
  barColor, 
  gradientColor, 
  dataKey, 
  barSize = 24 
}) => {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  
  if (!data || data.length === 0) {
    return <NoDataDisplay title={title} />;
  }

  // Derive colors for gradient effect
  const baseGradient = gradientColor || barColor;
  const chartId = `chart-${title.replace(/\s+/g, '-').toLowerCase()}`;

  const handleMouseEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
  };

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 mb-3 text-center">
        {title}
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 12, left: -18, bottom: 8 }}
            barGap={8}
            barCategoryGap={16}
          >
            <defs>
              <linearGradient id={`colorGradient-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={barColor} stopOpacity={1} />
                <stop offset="95%" stopColor={baseGradient} stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#e0e0e0" 
              strokeOpacity={0.4} 
              vertical={false} 
            />
            <XAxis
              dataKey="month"
              fontSize={10}
              interval={0}
              angle={-38}
              textAnchor="end"
              height={60}
              tick={{ fill: '#6B7280' }}
              axisLine={{ stroke: '#D1D5DB', strokeWidth: 1 }}
              tickLine={{ stroke: '#D1D5DB' }}
              tickMargin={8}
              padding={{ left: 8, right: 8 }}
            />
            <YAxis
              allowDecimals={false}
              fontSize={10}
              tick={{ fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              minTickGap={5}
              width={30}
            />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(224, 231, 255, 0.15)' }}
              wrapperStyle={{ outline: 'none' }}
            />
            <Legend 
              wrapperStyle={{ 
                fontSize: '0.75rem', 
                paddingTop: '12px', 
                paddingBottom: '5px',
                color: '#4B5563' 
              }}
              formatter={(value) => <span className="text-gray-600 dark:text-gray-300">{value}</span>}
            />
            <Bar 
              dataKey={dataKey} 
              name="Jumlah" 
              radius={[4, 4, 0, 0]} 
              barSize={barSize}
              animationDuration={1500}
              animationEasing="ease-in-out"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={index === activeIndex ? barColor : `url(#colorGradient-${chartId})`}
                  stroke={index === activeIndex ? barColor : 'none'}
                  strokeWidth={index === activeIndex ? 1 : 0}
                  className="transition-all duration-300"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

interface AdminDashboardChartsProps {
  pengajuanDiterimaTrend: MonthlyData[];
  pengajuanDitolakTrend: MonthlyData[];
}

const AdminDashboardCharts: React.FC<AdminDashboardChartsProps> = ({ 
  pengajuanDiterimaTrend, 
  pengajuanDitolakTrend 
}) => {
  // Periksa apakah kedua chart tidak memiliki data
  const noChartData = pengajuanDiterimaTrend.length === 0 && pengajuanDitolakTrend.length === 0;

  return (
    <section className="mt-10 mb-10">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          Statistik Tren Pengajuan
        </h2>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 md:mt-0">
          Data diperbarui secara otomatis
        </div>
      </div>
      
      {noChartData ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center flex flex-col justify-center items-center min-h-[300px]">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
            Belum Ada Data Grafik
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md">
            Statistik dan tren pengajuan akan ditampilkan di sini setelah terdapat data pengajuan yang diterima atau ditolak dalam sistem.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg flex flex-col min-h-[350px] border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300">
            <TrendChart 
              data={pengajuanDiterimaTrend} 
              title="Tren Pengajuan Diterima" 
              barColor="#10b981" 
              gradientColor="#34d399"
              dataKey="jumlah" 
              barSize={28} 
            />
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg flex flex-col min-h-[350px] border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300">
            <TrendChart 
              data={pengajuanDitolakTrend} 
              title="Tren Pengajuan Ditolak" 
              barColor="#ef4444" 
              gradientColor="#f87171"
              dataKey="jumlah" 
              barSize={28} 
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminDashboardCharts;