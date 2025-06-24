// Interface untuk data bulanan
export interface MonthlyData {
  month: string;
  jumlah: number; // Jumlah pengajuan
  // Bisa ditambahkan properti lain jika perlu, misal: total_tonase, dll.
}

// Fungsi helper untuk memproses data mentah menjadi tren bulanan
export const processDataForMonthlyTrend = (items: { created_at: string; [key: string]: any }[] | null | undefined): MonthlyData[] => {
  if (!items || items.length === 0) return [];

  const countsByMonthYear: Record<string, number> = {};
  items.forEach(item => {
    const date = new Date(item.created_at);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    const key = `${year}-${String(month).padStart(2, '0')}`; // Format YYYY-MM untuk sorting
    countsByMonthYear[key] = (countsByMonthYear[key] || 0) + 1;
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