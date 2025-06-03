"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface ChartDataItem {
  name: string;
  Jumlah: number;
}

interface PengajuanStatusChartProps {
  data: ChartDataItem[];
}

const COLORS = ['#82ca9d', '#FA8072']; // Green for Diterima, Light Red for Ditolak

export default function PengajuanStatusChart({ data }: PengajuanStatusChartProps) {
  if (!data || data.length === 0) {
    return <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">Tidak ada data untuk ditampilkan pada grafik.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
        <XAxis dataKey="name" stroke="#64748b" className="dark:stroke-slate-400" fontSize={12} />
        <YAxis allowDecimals={false} stroke="#64748b" className="dark:stroke-slate-400" fontSize={12} />
        <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.875rem' }} itemStyle={{ color: '#1e293b' }} labelStyle={{ color: '#1e293b', fontWeight: '600' }} formatter={(value: number) => [`${value} Pengajuan`, "Jumlah"]} />
        <Legend wrapperStyle={{ fontSize: '0.875rem', paddingTop: '10px' }} />
        <Bar dataKey="Jumlah" name="Jumlah Pengajuan" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}