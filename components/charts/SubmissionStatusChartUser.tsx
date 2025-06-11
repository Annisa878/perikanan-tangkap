"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface ChartDataItemUser {
  name: string;
  jumlah: number;
  fill: string;
}

interface SubmissionStatusChartUserProps {
  data: ChartDataItemUser[];
}

const SubmissionStatusChartUser: React.FC<SubmissionStatusChartUserProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-center text-slate-500 dark:text-slate-400 py-10">Belum ada data pengajuan untuk ditampilkan.</p>;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">Ringkasan Status Pengajuan Anda</h2>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 25, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} className="dark:stroke-slate-700" />
          <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary, #64748b)' }} className="dark:text-slate-400" />
          <YAxis allowDecimals={false} tick={{ fill: 'var(--color-text-secondary, #64748b)' }} className="dark:text-slate-400" />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--color-background-tooltip, #ffffff)', borderRadius: '0.5rem', borderColor: 'var(--color-border-tooltip, #e2e8f0)' }}
            labelStyle={{ color: 'var(--color-text-primary, #1e293b)'}}
            cursor={{ fill: 'rgba(200,200,200,0.1)' }}
          />
          <Bar dataKey="jumlah" name="Jumlah Pengajuan" barSize={50}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SubmissionStatusChartUser;