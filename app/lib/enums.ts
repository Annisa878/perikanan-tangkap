// Array of Domisili options, used for UI elements like dropdowns.
// This is the single source of truth for all domisili values.
export const DOMISILI_LIST = [
  "Kab. Banyuasin",
  "Kab. Empat Lawang",
  "Kab. Lahat",
  "Kab. Muara Enim",
  "Kab. Musi Banyuasin",
  "Kab. Musi Rawas",
  "Kab. Musi Rawas Utara",
  "Kab. Ogan Ilir",
  "Kab. Ogan Komering Ilir",
  "Kab. Ogan Komering Ulu",
  "Kab. Ogan Komering Ulu Selatan",
  "Kab. Ogan Komering Ulu Timur",
  "Kab. Penukal Abab Lematang Ilir",
  "Kota Lubuk Linggau",
  "Kota Palembang",
  "Kota Pagaralam",
  "Kota Prabumulih"
] as const;

// A TypeScript union type derived from the list above.
// This provides strong type-checking for domisili values.
export type Domisili = typeof DOMISILI_LIST[number];

// Array of Bulan options, used for UI elements like dropdowns.
export const BULAN_LIST = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
] as const;

// A TypeScript union type derived from the list above.
export type Bulan = typeof BULAN_LIST[number];