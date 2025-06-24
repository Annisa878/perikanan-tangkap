"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

export interface MonthlyData {
  month: string;
  jumlah: number;
};

interface TrendChartProps {
  data: MonthlyData[];
  title: string;
  barColor: string;
  glowColor: string;
  dataKey: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-xl border border-gray-200/50 dark:border-gray-600/50 p-3 rounded-lg">
        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{label}</p>
        <div className="flex items-center mt-1">
          <div className={`w-3 h-3 rounded-full mr-2`} style={{ backgroundColor: payload[0].color }} />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {payload[0].value} pengajuan
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const NoDataDisplay = ({ title }: { title: string }) => (
  <div className="h-full flex flex-col justify-center items-center text-center">
    <div className="w-16 h-16 mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center shadow-inner">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    </div>
    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Belum Ada Data</h3>
    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
      {title} akan ditampilkan ketika tersedia
    </p>
  </div>
);

const TrendChart: React.FC<TrendChartProps> = ({ 
  data, 
  title, 
  barColor, 
  glowColor,
  dataKey
}) => {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  
  if (!data || data.length === 0) {
    return <NoDataDisplay title={title} />;
  }

  const chartId = `chart-${title.replace(/\s+/g, '-').toLowerCase()}`;

  const handleMouseEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
  };

  // Pastikan data memiliki nilai yang valid
  const validData = data.filter(item => item && typeof item.jumlah === 'number');
  
  if (validData.length === 0) {
    return <NoDataDisplay title={title} />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {title}
        </h3>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Total: {validData.reduce((sum, item) => sum + item.jumlah, 0)}
        </div>
      </div>
      
      <div className="flex-1 min-h-0" style={{ minHeight: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={validData}
            margin={{ top: 20, right: 15, left: 0, bottom: 40 }}
            barGap={10}
            barCategoryGap="20%"
          >
            <defs>
              <linearGradient id={`gradient-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={barColor} stopOpacity={1} />
                <stop offset="100%" stopColor={barColor} stopOpacity={0.7} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#e2e8f0" 
              strokeOpacity={0.4} 
              vertical={false} 
            />
            
            <XAxis
              dataKey="month"
              fontSize={11}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
              tick={{ fill: '#64748B' }}
              axisLine={{ stroke: '#CBD5E1', strokeWidth: 1 }}
              tickLine={{ stroke: '#CBD5E1' }}
              tickMargin={8}
            />
            
            <YAxis
              allowDecimals={false}
              fontSize={11}
              tick={{ fill: '#64748B' }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              width={35}
              domain={[0, 'dataMax + 2']}
            />
            
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
              wrapperStyle={{ outline: 'none' }}
            />
            
            <Bar 
              dataKey="jumlah"
              fill={`url(#gradient-${chartId})`}
              radius={[4, 4, 0, 0]} 
              maxBarSize={50}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {validData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={index === activeIndex ? barColor : `url(#gradient-${chartId})`}
                  stroke={index === activeIndex ? barColor : 'transparent'}
                  strokeWidth={index === activeIndex ? 2 : 0}
                  style={{
                    filter: index === activeIndex ? 'brightness(1.1)' : 'none',
                    transition: 'all 0.3s ease'
                  }}
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
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          Statistik Pengajuan
        </h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Diterima</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Ditolak</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-white/20 dark:border-slate-700/50 flex flex-col hover:shadow-md hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-200">
          <TrendChart 
            data={pengajuanDiterimaTrend} 
            title="Pengajuan Diterima" 
            barColor="#10b981" // Emerald-500
            glowColor="#34d399" // Emerald-400
            dataKey="jumlah" 
          />
        </div>
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-white/20 dark:border-slate-700/50 flex flex-col hover:shadow-md hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-200">
          <TrendChart 
            data={pengajuanDitolakTrend} 
            title="Pengajuan Ditolak" 
            barColor="#ef4444" // Rose-500
            glowColor="#f87171" // Rose-400
            dataKey="jumlah" 
          />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardCharts;