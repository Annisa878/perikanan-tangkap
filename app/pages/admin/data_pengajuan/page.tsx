"use client";

import React, { useState, useEffect } from "react"; // Added React
import { createClient } from "@/utils/supabase/client"; // Ensure this path is correct
import { generatePengajuanExcelReport } from "@/utils/exportPengajuanToExcel"; 
import { Ship, ChevronDown, ChevronRight } from "lucide-react"; // Added Ship icon and Chevrons
import { useRouter } from "next/navigation"; // Import useRouter
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; 
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"; // Import Button for actions

// Define types
interface PengajuanData {
  id_pengajuan: string; // UUIDs are strings
  kelompok_id: string;  // UUIDs are strings
  dokumen_pengajuan: string;
  wilayah_penangkapan: string;
  status_dokumen: string;
  status_verifikasi: string;
  status_verifikasi_kabid: string;
  catatan_verifikasi: string | null;
  catatan_verifikasi_kabid: string | null;
  created_at: string;
  tanggal_pengajuan: string; // Added to resolve TypeScript error
  nama_kub: string;
  alamat_kub: string;
  kabupaten_kota: string;
  no_bast?: string | null;
  dokumen_bast?: string | null;
}

interface DetailUsulan {
  id_detail_usulan: string; // Assuming this might also be UUID or a string ID
  pengajuan_id: string;   // To match PengajuanData.id_pengajuan (UUID)
  nama_alat: string;
  jumlah_alat: number;
  harga_satuan: number;
  harga_total: number;
}

interface AnggotaKelompok {
  id_anggota: string; // Assuming this might also be UUID or a string ID
  kelompok_id: string; // To match PengajuanData.kelompok_id (UUID)
  nama_anggota: string;
  jabatan: string;
  nik: string;
  no_kusuka: string;
}

interface DokumenChecklist {
  proposal: boolean;
  surat_usulan: boolean;
  foto_ktp: boolean;
  surat_ktm: boolean;
  foto_rumah: boolean;
  foto_alat_tangkap: boolean;
  bpjs: boolean;
  kis: boolean;
  kartu_kusuka: boolean; // Added
  foto_kapal: boolean;   // Added
}

// Type for raw data from Supabase before transformation
type RawPengajuanFromSupabase = Omit<PengajuanData, 'nama_kub' | 'alamat_kub' | 'kabupaten_kota'> & {
  kelompok: {
    nama_kub: string;
    alamat_kub: string;
    kabupaten_kota: string;
  } | null; 
};

// Constants for filter options
const ALL_MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const KABUPATEN_KOTA_LIST = [
  "Banyuasin",
  "Empat Lawang",
  "Lahat",
  "Muara Enim",
  "Musi Banyuasin",
  "Musi Rawas",
  "Musi Rawas Utara",
  "Ogan Ilir",
  "Ogan Komering Ilir",
  "Ogan Komering Ulu",
  "Ogan Komering Ulu Selatan",
  "Ogan Komering Ulu Timur",
  "Penukal Abab Lematang Ilir",
  "Lubuklinggau",
  "Pagar Alam",
  "Palembang",
  "Prabumulih"
].sort(); // Sort alphabetically for display

export default function DataPengajuan() {
  const supabase = createClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [pengajuanList, setPengajuanList] = useState<PengajuanData[]>([]);
  const [selectedPengajuan, setSelectedPengajuan] = useState<PengajuanData | null>(null);
  const [detailUsulan, setDetailUsulan] = useState<DetailUsulan[]>([]);
  const [anggotaKelompok, setAnggotaKelompok] = useState<AnggotaKelompok[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [dokumenUrl, setDokumenUrl] = useState<string | null>(null);
  const [isEditingItem, setIsEditingItem] = useState<string | null>(null); // Changed type to string | null
  const [editItemData, setEditItemData] = useState<DetailUsulan | null>(null);
  const [isExporting, setIsExporting] = useState(false); // State for export loading
  
  // BAST state
  const [noBastInput, setNoBastInput] = useState<string>("");
  const [bastFile, setBastFile] = useState<File | null>(null);
  const [bastDokumenUrl, setBastDokumenUrl] = useState<string | null>(null);
  const [showBastModal, setShowBastModal] = useState(false);

  // Checklist state
  const [dokumenChecklist, setDokumenChecklist] = useState<DokumenChecklist>({
    proposal: false,
    surat_usulan: false,
    foto_ktp: false,
    surat_ktm: false,
    foto_rumah: false,
    foto_alat_tangkap: false,
    bpjs: false,
    kis: false,
    kartu_kusuka: false, // Added
    foto_kapal: false    // Added
  });

  // Status verifikasi options
  const statusOptions = ["Menunggu", "Diterima", "Ditolak"];
  const [statusVerifikasi, setStatusVerifikasi] = useState("Menunggu");
  const [catatan, setCatatan] = useState("");

  // Filter states
  const [filterStatusAdmin, setFilterStatusAdmin] = useState<string>("");
  const [filterStatusKabid, setFilterStatusKabid] = useState<string>("");
  const [filterBulan, setFilterBulan] = useState<string>("");
  const [filterTahun, setFilterTahun] = useState<string>("");
  const [filterKabupatenKota, setFilterKabupatenKota] = useState<string>("");
  const [filterNamaKub, setFilterNamaKub] = useState<string>(""); // State for Nama KUB filter
  const [availableBulan, setAvailableBulan] = useState<string[]>([]);
  const [availableTahun, setAvailableTahun] = useState<string[]>([]);

  // State for Edit Pengajuan Dialog
  const [isEditPengajuanModalOpen, setIsEditPengajuanModalOpen] = useState(false);
  const [currentEditingPengajuan, setCurrentEditingPengajuan] = useState<PengajuanData | null>(null);
  const [editPengajuanFormData, setEditPengajuanFormData] = useState({
    tanggal_pengajuan: '',
    wilayah_penangkapan: '',
    alamat_kub: '',
    kabupaten_kota: '',
  });
  const [availableKabupatenKota, setAvailableKabupatenKota] = useState<string[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1); // Diaktifkan kembali
  const ITEMS_PER_PAGE = 10; // Diaktifkan kembali, jumlah item per halaman

  // Fetch all pengajuan data
  useEffect(() => {
    const fetchPengajuan = async () => {
      setIsLoading(true);
      try {
        // Join pengajuan with kelompok to get nama_kub
        const { data, error } = await supabase
          .from('pengajuan')
          .select(`
            *,
            kelompok:kelompok_id(nama_kub, alamat_kub, kabupaten_kota)
          `)
          .order('tanggal_pengajuan', { ascending: false });

        if (error) throw error;
        const rawData = data as RawPengajuanFromSupabase[];

        // Transform data to include nama_kub directly
        const formattedData = rawData.map((item) => ({
          ...item,
          nama_kub: item.kelompok?.nama_kub || 'Data Kelompok Tidak Ditemukan',
          alamat_kub: item.kelompok?.alamat_kub || 'Data Kelompok Tidak Ditemukan',
          kabupaten_kota: item.kelompok?.kabupaten_kota || 'Data Kelompok Tidak Ditemukan',
        })) as PengajuanData[];

        setPengajuanList(formattedData);

        // Set static and calculated filter options
        setAvailableBulan(ALL_MONTHS_ID);

        const currentYear = new Date().getFullYear();
        const lastThreeYears = [
          currentYear.toString(),
          (currentYear - 1).toString(),
          (currentYear - 2).toString()
        ];
        setAvailableTahun(lastThreeYears);

        setAvailableKabupatenKota(KABUPATEN_KOTA_LIST);

      } catch (error) {
        console.error("Error fetching pengajuan:", error);
        alert("Gagal memuat data pengajuan");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPengajuan();
  }, []);

  // Fetch detail when a pengajuan is selected
  const handleViewDetail = async (pengajuan: PengajuanData) => {
    // If clicking the already selected item, collapse it and reset states
    if (selectedPengajuan?.id_pengajuan === pengajuan.id_pengajuan) {
      setSelectedPengajuan(null);
      setDetailUsulan([]);
      setAnggotaKelompok([]);
      setDokumenChecklist({ 
        proposal: false, surat_usulan: false, foto_ktp: false, surat_ktm: false,
        foto_rumah: false, foto_alat_tangkap: false, bpjs: false, kis: false,
        kartu_kusuka: false, foto_kapal: false
      });
      setNoBastInput("");
      setBastFile(null);
      setStatusVerifikasi("Menunggu"); 
      setCatatan(""); 
      setIsEditingItem(null);
      setEditItemData(null);
      return;
    }

    // If selecting a new item (or the first item)
    setIsDetailLoading(true);
    setSelectedPengajuan(pengajuan); // Set the new selection

    // Reset states before fetching new data for the newly selected item
    setDetailUsulan([]);
    setAnggotaKelompok([]);
    setDokumenChecklist({ 
      proposal: false, surat_usulan: false, foto_ktp: false, surat_ktm: false,
      foto_rumah: false, foto_alat_tangkap: false, bpjs: false, kis: false,
      kartu_kusuka: false, foto_kapal: false
    });
    setNoBastInput("");
    setBastFile(null); 
    setStatusVerifikasi("Menunggu"); 
    setCatatan(""); 
    setIsEditingItem(null); 
    setEditItemData(null);

    try {
      // Fetch detail usulan
      const { data: usulanData, error: usulanError } = await supabase
        .from('detail_usulan')
        .select('*')
        .eq('pengajuan_id', pengajuan.id_pengajuan);

      if (usulanError) throw usulanError;
      setDetailUsulan(usulanData as DetailUsulan[]);

      // Fetch anggota kelompok
      const { data: anggotaData, error: anggotaError } = await supabase
        .from('anggota_kelompok')
        .select('*')
        .eq('kelompok_id', pengajuan.kelompok_id);

      if (anggotaError) throw anggotaError;
      setAnggotaKelompok(anggotaData as AnggotaKelompok[]);

      // Parse status_dokumen if it exists (This will now populate the cleared state)
      if (pengajuan.status_dokumen) {
        try {
          // Ensure it's a non-empty string before attempting to parse
          if (typeof pengajuan.status_dokumen === 'string' && pengajuan.status_dokumen.trim() !== '') {
            const parsedChecklist = JSON.parse(pengajuan.status_dokumen);
            setDokumenChecklist(parsedChecklist);
          }
        } catch (e) {
          console.error("Error parsing status_dokumen JSON:", e, "Raw value:", pengajuan.status_dokumen);
          // The dokumenChecklist state is already reset to default, so UI will show a blank checklist.
        }
      } else {
        // If status_dokumen is null/empty, the state is already reset above
      }

      // Set status verifikasi (This will now populate the cleared state)
      setStatusVerifikasi(pengajuan.status_verifikasi || "Menunggu");
      setCatatan(pengajuan.catatan_verifikasi || "");
      
      // Set BAST info (This will now populate the cleared state)
      setNoBastInput(pengajuan.no_bast || "");
      // bastFile is already reset above
      // bastDokumenUrl is already reset above

    } catch (error) {
      console.error("Error fetching details:", error);
      alert("Gagal memuat detail pengajuan");
      setSelectedPengajuan(null); 
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Check if pengajuan is locked (verified by Kepala Bidang)
  const isPengajuanLocked = (): boolean => {
    // Perubahan: Admin selalu dapat mengedit, terlepas dari status verifikasi Kabid.
    return false;
    // Logika asli yang dikomentari:
    // return !!selectedPengajuan?.status_verifikasi_kabid && 
    //        ["Disetujui Sepenuhnya", "Disetujui Sebagian", "Ditolak"].includes(selectedPengajuan.status_verifikasi_kabid);
  };

  //   Handle document preview
  const handlePreviewDocument = async () => {
    if (!selectedPengajuan || !selectedPengajuan.dokumen_pengajuan) {
      alert("Path dokumen pengajuan tidak tersedia.");
      return;
    }

    const filePath = selectedPengajuan.dokumen_pengajuan;
    console.log("Attempting to get signed URL for (pengajuan):", filePath);

    try {
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('uploads')
        .createSignedUrl(filePath, 300); // 300 seconds (5 minutes) validity

      if (signedUrlError) {
        console.error("Error creating signed URL for pengajuan:", signedUrlError); // Log a full error object
        // Fallback to public URL
        console.log("Falling back to public URL for (pengajuan):", filePath);
        const { data: publicURLData } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);

        if (publicURLData && publicURLData.publicUrl) {
          console.log("Public URL obtained for pengajuan:", publicURLData.publicUrl);
          setDokumenUrl(publicURLData.publicUrl);
          setShowModal(true);
        } else {
          console.error("Failed to get public URL for pengajuan or public URL is null. Public URL Data:", publicURLData);
          alert("Gagal memuat dokumen pengajuan. Tidak dapat membuat URL pratinjau.");
        }
      } else if (signedUrlData && signedUrlData.signedUrl) {
        console.log("Signed URL obtained for pengajuan:", signedUrlData.signedUrl);
        setDokumenUrl(signedUrlData.signedUrl);
        setShowModal(true);
      } else {
        console.error("Signed URL data for pengajuan is null or signedUrl property is missing.");
        alert("Gagal memuat dokumen pengajuan. URL pratinjau tidak valid.");
      }
    } catch (err: any) {
      console.error("Unexpected error in handlePreviewDocument:", err.message);
      alert("Terjadi kesalahan tak terduga saat mencoba memuat dokumen pengajuan.");
    }
  };

  // Handle document download
  const handleDownloadDocument = async () => {
    if (!selectedPengajuan || !selectedPengajuan.dokumen_pengajuan) {
      alert("Path dokumen pengajuan tidak tersedia.");
      return;
    }

    const filePath = selectedPengajuan.dokumen_pengajuan;
    console.log("Attempting to get signed URL for download (pengajuan):", filePath);

    try {
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('uploads')
        .createSignedUrl(filePath, 300, { download: true }); // Add download: true

      let downloadUrl: string | null = null;

      if (signedUrlError) {
        console.error("Error creating signed URL for download (pengajuan):", signedUrlError.message);
        console.log("Falling back to public URL for download (pengajuan):", filePath);
        const { data: publicURLData } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);
        
        if (publicURLData && publicURLData.publicUrl) {
          downloadUrl = publicURLData.publicUrl;
        }
      } else if (signedUrlData && signedUrlData.signedUrl) {
        downloadUrl = signedUrlData.signedUrl;
      }

      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', filePath.substring(filePath.lastIndexOf('/') + 1)); // Suggest a filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert("Gagal mendapatkan URL unduhan untuk dokumen pengajuan.");
      }
    } catch (err: any) {
      console.error("Unexpected error in handleDownloadDocument:", err.message);
      alert("Terjadi kesalahan tak terduga saat mencoba mengunduh dokumen pengajuan.");
    }
  };

  // Handle opening the edit dialog for Pengajuan
  const handleOpenEditPengajuanDialog = (pengajuan: PengajuanData) => {
    if (isPengajuanLocked()) {
      alert("Tidak dapat mengedit pengajuan yang telah diverifikasi oleh Kepala Bidang.");
      return;
    }
    setCurrentEditingPengajuan(pengajuan);
    setEditPengajuanFormData({
      tanggal_pengajuan: pengajuan.tanggal_pengajuan ? new Date(pengajuan.tanggal_pengajuan).toISOString().split('T')[0] : '', // Format to YYYY-MM-DD
      wilayah_penangkapan: pengajuan.wilayah_penangkapan || '',
      alamat_kub: pengajuan.alamat_kub || '',
      kabupaten_kota: pengajuan.kabupaten_kota || '',
    });
    setIsEditPengajuanModalOpen(true);
  };

  // Handle input change for edit pengajuan form
  const handleEditPengajuanInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditPengajuanFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle saving edited pengajuan
  const handleSaveEditedPengajuan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEditingPengajuan) return;

    // Data for 'pengajuan' table
    const pengajuanUpdateData = {
      tanggal_pengajuan: editPengajuanFormData.tanggal_pengajuan,
      wilayah_penangkapan: editPengajuanFormData.wilayah_penangkapan,
    };

    // Data for 'kelompok' table
    const kelompokUpdateData = {
      alamat_kub: editPengajuanFormData.alamat_kub,
      kabupaten_kota: editPengajuanFormData.kabupaten_kota,
    };

    try {
      // Update 'pengajuan' table
      const { error: pengajuanError } = await supabase
        .from('pengajuan')
        .update(pengajuanUpdateData)
        .eq('id_pengajuan', currentEditingPengajuan.id_pengajuan);

      if (pengajuanError) throw pengajuanError;

      // Update 'kelompok' table
      if (currentEditingPengajuan.kelompok_id) {
        const { error: kelompokError } = await supabase
          .from('kelompok')
          .update(kelompokUpdateData)
          .eq('id_kelompok', currentEditingPengajuan.kelompok_id); // Assuming PK of kelompok table is 'id_kelompok'

        if (kelompokError) throw kelompokError;
      } else {
        console.warn("kelompok_id is missing, cannot update kelompok data.");
      }

      // Update local state
      setPengajuanList(prevList =>
        prevList.map(p => {
          let updatedP = { ...p };
          // Update fields from 'pengajuan' table
          if (p.id_pengajuan === currentEditingPengajuan.id_pengajuan) {
            updatedP = {
              ...updatedP,
              ...pengajuanUpdateData,
            };
          }
          // Update fields from 'kelompok' table if kelompok_id matches
          if (p.kelompok_id === currentEditingPengajuan.kelompok_id) {
            updatedP = {
              ...updatedP,
              ...kelompokUpdateData, // This will update alamat_kub and kabupaten_kota
            };
          }
          return updatedP;
        })
      );
      
      if (selectedPengajuan && selectedPengajuan.id_pengajuan === currentEditingPengajuan.id_pengajuan) {
        setSelectedPengajuan(prevSelected => prevSelected ? { 
          ...prevSelected, 
          ...pengajuanUpdateData, 
          ...kelompokUpdateData,   // Fields from kelompok table
        } : null);
      }

      setIsEditPengajuanModalOpen(false);
      setCurrentEditingPengajuan(null);
      alert("Data pengajuan berhasil diperbarui.");
    } catch (error) {
      console.error("Error updating pengajuan:", error);
      alert("Gagal memperbarui data pengajuan.");
    }
  };


  // Handle BAST document preview
  const handlePreviewBastDocument = async () => {
    if (!selectedPengajuan || !selectedPengajuan.dokumen_bast) {
      alert("Path Dokumen BAST tidak tersedia.");
      return;
    }
    const filePath = selectedPengajuan.dokumen_bast;
    console.log("Attempting to get signed URL for (BAST):", filePath);
    try {
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('uploads')
        .createSignedUrl(filePath, 300); // 300 seconds (5 minutes) validity

      if (signedUrlError) {
        console.error("Error creating signed URL for BAST:", signedUrlError); // Log a full error object
        // Fallback to public URL
        console.log("Falling back to public URL for (BAST):", filePath);
        const { data: publicURLData } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);

        if (publicURLData && publicURLData.publicUrl) {
          console.log("Public URL obtained for BAST:", publicURLData.publicUrl);
          setBastDokumenUrl(publicURLData.publicUrl);
          setShowBastModal(true);
        } else {
          console.error("Failed to get public URL for BAST or public URL is null. Public URL Data:", publicURLData);
          alert("Gagal memuat dokumen BAST. Tidak dapat membuat URL pratinjau.");
        }
      } else if (signedUrlData && signedUrlData.signedUrl) {
        console.log("Signed URL obtained for BAST:", signedUrlData.signedUrl);
        setBastDokumenUrl(signedUrlData.signedUrl);
        setShowBastModal(true);
      } else {
        console.error("Signed URL data for BAST is null or signedUrl property is missing.");
        alert("Gagal memuat dokumen BAST. URL pratinjau tidak valid.");
      }
    } catch (err: any) {
      console.error("Unexpected error in handlePreviewBastDocument:", err.message);
      alert("Terjadi kesalahan tak terduga saat mencoba memuat dokumen BAST.");
    }
  };

  // Handle updating an item's quantity
  const startEditItem = (item: DetailUsulan) => { // id_detail_usulan is now string
    if (isPengajuanLocked()) {
      alert("Tidak dapat mengedit pengajuan yang telah diverifikasi oleh Kepala Bidang");
      return;
    }
    
    setIsEditingItem(item.id_detail_usulan);
    setEditItemData({
       ...item,
       harga_satuan: item.harga_satuan || 0,
       harga_total: item.harga_total || item.jumlah_alat * (item.harga_satuan || 0)  
      });
  };

  const saveEditItem = async () => {
    if (!editItemData || isEditingItem === null || isPengajuanLocked()) return; // Check isEditingItem for null
  
    const jumlahAlat = editItemData.jumlah_alat || 0;
    const hargaSatuan = editItemData.harga_satuan || 0;

    try {
      // Only update jumlah_alat and harga_satuan, not harga_total
      const { error } = await supabase
        .from('detail_usulan')
        .update({ 
          jumlah_alat: jumlahAlat,
          harga_satuan: hargaSatuan
        })
        .eq('id_detail_usulan', isEditingItem);
  
      if (error) throw error;
  
      // Update the local state - still calculate harga_total for UI
      setDetailUsulan(
        detailUsulan.map((item: DetailUsulan) => // Explicitly type item
          item.id_detail_usulan === isEditingItem ? {
            ...editItemData,
            jumlah_alat: jumlahAlat,
            harga_satuan: hargaSatuan,
            harga_total: jumlahAlat * hargaSatuan // Calculate for display purposes
          } : item
        )
      );
  
      // If updating total in pengajuan table is needed, calculate based on all items
      if (selectedPengajuan) {
        const newTotal = detailUsulan
          .map((item: DetailUsulan) => { // Explicitly type item
            if (item.id_detail_usulan === isEditingItem) {
              return jumlahAlat * hargaSatuan;
            } else {
              return item.harga_total || item.jumlah_alat * (item.harga_satuan || 0) || 0;
            }
          })
          .reduce((sum, current) => sum + current, 0);

        await supabase
          .from('pengajuan')
          .update({ total_keseluruhan: newTotal })
          .eq('id_pengajuan', selectedPengajuan.id_pengajuan);
      }
  
      setIsEditingItem(null);
      setEditItemData(null);
  
    } catch (error) {
      console.error("Error updating item:", error);
      alert("Gagal menyimpan perubahan");
    }
  };

  const cancelEditItem = () => {
    setIsEditingItem(null);
    setEditItemData(null);
  };

  // Delete an item
  const handleDeleteItem = async (id: string) => { // id_detail_usulan is now string
    if (isPengajuanLocked()) {
      alert("Tidak dapat menghapus item pada pengajuan yang telah diverifikasi oleh Kepala Bidang");
      return;
    }
    
    if (!confirm("Yakin ingin menghapus item ini?")) return;

    try {
      const { error } = await supabase
        .from('detail_usulan')
        .delete()
        .eq('id_detail_usulan', id);

      if (error) throw error;

      // Update local state
      setDetailUsulan(detailUsulan.filter((item: DetailUsulan) => item.id_detail_usulan !== id)); // Explicitly type item

    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Gagal menghapus item");
    }
  };

  // Handle document checklist changes
  const handleChecklistChange = (field: keyof DokumenChecklist) => {
    if (isPengajuanLocked()) {
      alert("Tidak dapat mengubah checklist pada pengajuan yang telah diverifikasi oleh Kepala Bidang");
      return;
    }
    
    setDokumenChecklist({
      ...dokumenChecklist,
      [field]: !dokumenChecklist[field]
    });
  };

  // Save verification status
  const saveVerification = async () => {
    if (!selectedPengajuan || isPengajuanLocked()) {
      if (isPengajuanLocked()) {
        alert("Tidak dapat mengubah status verifikasi pengajuan yang telah diverifikasi oleh Kepala Bidang");
      }
      return;
    }

    try {
      // Convert checklist to JSON string
      const checklistJson = JSON.stringify(dokumenChecklist);
      let bastFilePath: string | undefined = selectedPengajuan.dokumen_bast || undefined;

      // Handle BAST file upload
      if (bastFile) {
        const filePath = `kelompok_${selectedPengajuan.kelompok_id}/dokumen_bast/${Date.now()}_${bastFile.name}`;
        const { data: fileData, error: fileError } = await supabase.storage
          .from("uploads")
          .upload(filePath, bastFile);

        if (fileError) throw fileError;
        if (!fileData || !fileData.path) throw new Error("Gagal mendapatkan path dokumen BAST setelah upload.");
        bastFilePath = fileData.path;
      }

      const updateData: Partial<PengajuanData> = {
        status_dokumen: checklistJson,
        status_verifikasi: statusVerifikasi,
        catatan_verifikasi: catatan,
        no_bast: noBastInput || null,
      };

      if (bastFilePath !== undefined) {
        updateData.dokumen_bast = bastFilePath;
      }

      const { error } = await supabase
        .from('pengajuan')
        .update(updateData)
        .eq('id_pengajuan', selectedPengajuan.id_pengajuan);

      if (error) throw error;

      // Update the local state
      const updatedSelectedPengajuan = {
        ...selectedPengajuan,
        ...updateData, // Merge updated fields
      };
      setPengajuanList(
        pengajuanList.map(item =>
          item.id_pengajuan === selectedPengajuan.id_pengajuan
            ? {
              ...item,
              status_dokumen: checklistJson,
              status_verifikasi: statusVerifikasi,
              catatan_verifikasi: catatan,
              no_bast: noBastInput || null,
              dokumen_bast: bastFilePath || item.dokumen_bast // Keep old if not updated
            }
            : item
        )
      );
      setSelectedPengajuan(null); // Langsung kembali ke daftar dengan mengosongkan item terpilih
      alert("Data Anda Berhasil Disimpan"); // Pesan sukses

    } catch (error) {
      console.error("Error saving verification:", error);
      alert("Gagal menyimpan data"); // Pesan error
    }
  };

  // Handle deleting a pengajuan
  const handleDeletePengajuan = async (id_pengajuan: string, nama_kub: string) => {
    if (isPengajuanLocked()) {
      alert("Tidak dapat menghapus pengajuan yang telah diverifikasi oleh Kepala Bidang.");
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus pengajuan dari KUB "${nama_kub}"? Tindakan ini tidak dapat diurungkan dan akan menghapus semua detail terkait.`)) {
      return;
    }

    try {
      // Optional: Delete related detail_usulan first if no cascade delete is set up
      // const { error: detailError } = await supabase
      //   .from('detail_usulan')
      //   .delete()
      //   .eq('pengajuan_id', id_pengajuan);
      // if (detailError) throw detailError;

      const { error } = await supabase
        .from('pengajuan')
        .delete()
        .eq('id_pengajuan', id_pengajuan);

      if (error) throw error;

      setPengajuanList(pengajuanList.filter(p => p.id_pengajuan !== id_pengajuan));
      setSelectedPengajuan(null); // Clear selection if the deleted item was selected
      alert(`Pengajuan dari KUB "${nama_kub}" berhasil dihapus.`);
    } catch (error) {
      console.error("Error deleting pengajuan:", error);
      alert("Gagal menghapus pengajuan.");
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Diterima": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-700 dark:text-emerald-200";
      case "Ditolak": return "bg-rose-100 text-rose-700 dark:bg-rose-700 dark:text-rose-200";
      case "Disetujui Sepenuhnya": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-700 dark:text-emerald-200";
      case "Disetujui Sebagian": return "bg-sky-100 text-sky-700 dark:bg-sky-700 dark:text-sky-200";
      default: return "bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-200"; // Menunggu
    }
  };

  // Get status badge color for Kabid verification
  const getKabidStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Disetujui Sepenuhnya": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-700 dark:text-emerald-200";
      case "Disetujui Sebagian": return "bg-sky-100 text-sky-700 dark:bg-sky-700 dark:text-sky-200";
      case "Ditolak": return "bg-rose-100 text-rose-700 dark:bg-rose-700 dark:text-rose-200";
      default: return "bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-200"; // Menunggu
    }
  };

  // Filtered data
  const filteredPengajuanList = pengajuanList.filter((p: PengajuanData) => { // Explicitly type p
    const pengajuanDate = new Date(p.tanggal_pengajuan); 
    const pengajuanBulan = pengajuanDate.toLocaleString('id-ID', { month: 'long' });
    const pengajuanTahun = pengajuanDate.getFullYear().toString();

    return (
      (filterStatusAdmin === "" || p.status_verifikasi === filterStatusAdmin) &&
      (filterStatusKabid === "" || p.status_verifikasi_kabid === filterStatusKabid) &&
      (filterBulan === "" || pengajuanBulan === filterBulan) &&
      (filterTahun === "" || pengajuanTahun === filterTahun) &&
      (filterKabupatenKota === "" || p.kabupaten_kota === filterKabupatenKota) &&
      (filterNamaKub === "" || p.nama_kub.toLowerCase().includes(filterNamaKub.toLowerCase()))
    );
  });

  // Pagination logic
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE; // Diaktifkan kembali
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE; // Diaktifkan kembali
  const currentItems = filteredPengajuanList.slice(indexOfFirstItem, indexOfLastItem); // Diaktifkan kembali
  const totalPages = Math.ceil(filteredPengajuanList.length / ITEMS_PER_PAGE); // Diaktifkan kembali


  // Handle export to Excel
  const handleExportToExcel = async () => {
    if (filteredPengajuanList.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }
    setIsExporting(true); // Use the correct state setter
    try {
    const result = await generatePengajuanExcelReport(filteredPengajuanList, supabase); 
      if (result.success) {
        // Optional: alert("Laporan Excel berhasil dibuat dan diunduh."); // The utility already handles download
      } else {
        alert(result.message || "Gagal membuat laporan Excel.");
      }
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Terjadi kesalahan saat mengekspor ke Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle export to Excel for approved (sebagian & sepenuhnya) by Kabid
  const handleExportApprovedKabidToExcel = async () => {
    // Filter data specifically for "Disetujui Sebagian" and "Disetujui Sepenuhnya" by Kabid
    // while still respecting other active filters (Status Admin, Bulan, Tahun, Kabupaten/Kota)
    const approvedKabidData = pengajuanList.filter((p: PengajuanData) => { // Explicitly type p
      const pengajuanDate = new Date(p.created_at);
      const pengajuanBulan = pengajuanDate.toLocaleString('id-ID', { month: 'long' });
      const pengajuanTahun = pengajuanDate.getFullYear().toString();

      return (
        (p.status_verifikasi_kabid === "Disetujui Sebagian" || p.status_verifikasi_kabid === "Disetujui Sepenuhnya") &&
        (filterStatusAdmin === "" || p.status_verifikasi === filterStatusAdmin) &&
        (filterBulan === "" || pengajuanBulan === filterBulan) &&
        (filterTahun === "" || pengajuanTahun === filterTahun) &&
        (filterKabupatenKota === "" || p.kabupaten_kota === filterKabupatenKota)
      );
    });

    if (approvedKabidData.length === 0) {
      alert("Tidak ada data pengajuan yang disetujui (sebagian/sepenuhnya) oleh Kepala Bidang untuk diekspor berdasarkan filter lainnya.");
      return;
    }
    setIsExporting(true); // Use the correct state setter
    try {
  const result = await generatePengajuanExcelReport(approvedKabidData, supabase); 
      if (!result.success) {
        alert(result.message || "Gagal membuat laporan Excel untuk data yang disetujui Kabid.");
      }
    } catch (error) {
      console.error("Error exporting approved Kabid data to Excel:", error);
      alert("Terjadi kesalahan saat mengekspor data yang disetujui Kabid ke Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle page change for pagination
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    // Mengadopsi layout utama dan latar belakang dari halaman admin lainnya
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-900 dark:to-cyan-950 text-slate-700 dark:text-slate-200">
      {/* Header disesuaikan dengan gaya admin lainnya */}
      <header className="bg-white/70 dark:bg-sky-950/70 backdrop-blur-md py-4 shadow-md sticky top-0 z-40 border-b border-sky-300/70 dark:border-sky-800/70">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-xl md:text-2xl font-semibold flex items-center text-sky-700 dark:text-sky-300">
            <Ship className="mr-2.5 h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            Data Pengajuan
          </div>
        </div>
      </header>

      {/* Kontainer konten utama disesuaikan */}
      <main className="container mx-auto py-6 md:py-8 px-4 md:px-6 flex-1">
       

      <div className="mb-6 p-4 md:p-6 border border-sky-200 dark:border-sky-700 rounded-xl bg-blue-50 dark:bg-slate-800 shadow-lg">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <div className="flex-grow min-w-[150px] sm:min-w-[200px]">
            <label htmlFor="filterNamaKub" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5">Nama KUB</label>
            <input
              type="text"
              id="filterNamaKub"
              value={filterNamaKub}
              onChange={(e) => setFilterNamaKub(e.target.value)}
              placeholder="Cari Nama KUB..."
              className="w-full px-3 py-2 border border-sky-300 dark:border-sky-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500 transition-colors"
            />
          </div>
          <div className="flex-grow min-w-[150px] sm:min-w-[180px]">
            <label htmlFor="filterStatusAdmin" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5">Status Admin</label>
            <select
              id="filterStatusAdmin"
              value={filterStatusAdmin}
              onChange={(e) => setFilterStatusAdmin(e.target.value)}
              className="w-full px-3 py-2 border border-sky-300 dark:border-sky-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500 transition-colors"
            >
              <option value="">Semua Status Admin</option>
              {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div className="flex-grow min-w-[150px] sm:min-w-[180px]">
            <label htmlFor="filterStatusKabid" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5">Status Kabid</label>
            <select
              id="filterStatusKabid"
              value={filterStatusKabid}
              onChange={(e) => setFilterStatusKabid(e.target.value)}
              className="w-full px-3 py-2 border border-sky-300 dark:border-sky-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500 transition-colors"
            >
              <option value="">Semua Status Kabid</option>
              {/* Assuming these are the possible Kabid statuses */}
              <option value="Menunggu">Menunggu</option>
              <option value="Disetujui Sepenuhnya">Disetujui Sepenuhnya</option>
              <option value="Disetujui Sebagian">Disetujui Sebagian</option>
              <option value="Ditolak">Ditolak</option>
            </select>
          </div>
          <div className="flex-grow min-w-[120px] sm:min-w-[150px]">
            <label htmlFor="filterBulan" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5">Bulan</label>
            <select
              id="filterBulan"
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="w-full px-3 py-2 border border-sky-300 dark:border-sky-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500 transition-colors"
            >
              <option value="">Semua Bulan</option>
              {availableBulan.map(bulan => <option key={bulan} value={bulan}>{bulan}</option>)}
            </select>
          </div>
          <div className="flex-grow min-w-[100px] sm:min-w-[120px]">
            <label htmlFor="filterTahun" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5">Tahun</label>
            <select
              id="filterTahun"
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="w-full px-3 py-2 border border-sky-300 dark:border-sky-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500 transition-colors"
            >
              <option value="">Semua Tahun</option>
              {availableTahun.map(tahun => <option key={tahun} value={tahun}>{tahun}</option>)}
            </select>
          </div>
          <div className="flex-grow min-w-[150px] sm:min-w-[180px]">
            <label htmlFor="filterKabupatenKota" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5">Kabupaten/Kota</label>
            <select
              id="filterKabupatenKota"
              value={filterKabupatenKota}
              onChange={(e) => setFilterKabupatenKota(e.target.value)}
              className="w-full px-3 py-2 border border-sky-300 dark:border-sky-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500 transition-colors"
            >
              <option value="">Semua Kabupaten/Kota</option>
              {availableKabupatenKota.map(kab => <option key={kab} value={kab}>{kab}</option>)}
            </select>
          </div>
          {/* Anda bisa menambahkan tombol "Reset Filter" di sini jika diinginkan */}
          {/* <button 
            onClick={() => {
              setFilterStatusAdmin("");
              setFilterStatusKabid("");
              setFilterBulan("");
              setFilterTahun("");
              setFilterKabupatenKota("");
              setFilterNamaKub(""); // Reset filter Nama KUB juga
            }}
            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md text-sm hover:bg-slate-300 dark:hover:bg-slate-500"
          >
            Reset
          </button> */}
        </div>
        {/* Export Buttons - New Position */}
        {!isLoading && pengajuanList.length > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleExportToExcel}
              disabled={isExporting || filteredPengajuanList.length === 0}
              className="w-full sm:w-auto px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-md shadow-sm hover:shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center text-sm"
            >
              {isExporting ? (
                <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Mengekspor...</>
              ) : "Export Sesuai Filter"}
            </button>
            <button
              onClick={handleExportApprovedKabidToExcel}
              disabled={isExporting}
              className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-md shadow-sm hover:shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center text-sm"
            >
              {isExporting ? (
                <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Mengekspor...</>
              ) : "Export Disetujui Kabid"}
            </button>
          </div>
        )}
      </div>

      {/* Full-width container for list and expandable details */}
      <div className="w-full bg-blue-50 dark:bg-slate-800 p-4 md:p-5 rounded-xl shadow-lg flex flex-col border border-sky-100 dark:border-sky-800">
          <h2 className="font-semibold text-xl mb-4 text-sky-700 dark:text-sky-200 border-b pb-3 border-sky-200 dark:border-sky-700">Daftar Pengajuan</h2>
          {isLoading ? (
            <p className="text-center py-4 text-slate-600 dark:text-slate-400">Memuat data...</p>
          ) : pengajuanList.length === 0 ? (
            <p className="text-center py-4 text-slate-600 dark:text-slate-400 flex-grow flex items-center justify-center">Tidak ada data pengajuan</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-sky-600 dark:bg-sky-700">
                    <TableRow>
                      <TableHead className="text-white font-semibold w-[50px]">No.</TableHead> {/* Added No. column header */}
                      <TableHead className="text-white font-semibold">Nama KUB</TableHead>
                      <TableHead className="text-white font-semibold">Tgl. Pengajuan</TableHead>
                      <TableHead className="text-white font-semibold">Wilayah</TableHead>
                      <TableHead className="text-white font-semibold">Status Admin</TableHead>
                      <TableHead className="text-white font-semibold">Status Kabid</TableHead>
                      <TableHead className="text-white font-semibold text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {currentItems.length > 0 ? currentItems.map((item, index) => (
                      <React.Fragment key={item.id_pengajuan}>
                        <TableRow 
                          className={`hover:bg-sky-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${selectedPengajuan?.id_pengajuan === item.id_pengajuan ? 'bg-sky-100 dark:bg-sky-700/60' : ''}`}
                          // onClick={() => handleViewDetail(item)} // Option 1: Click row to view detail
                        >
                          <TableCell className="text-slate-600 dark:text-slate-300 py-3 px-4 text-center">{index + 1}</TableCell> {/* Added No. cell */}
                          <TableCell className="font-medium text-slate-700 dark:text-slate-200 py-3 px-4">{item.nama_kub}</TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-300 py-3 px-4">
                            {new Date(item.tanggal_pengajuan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-300 py-3 px-4">
                            {item.wilayah_penangkapan === 'perairan_umum_daratan' ? 'Daratan' : 'Laut'}
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getStatusBadgeColor(item.status_verifikasi || 'Menunggu')}`}>
                              {item.status_verifikasi || 'Menunggu'}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            {item.status_verifikasi_kabid ? (
                              <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getKabidStatusBadgeColor(item.status_verifikasi_kabid)} flex items-center`}>
                                {item.status_verifikasi_kabid}
                                {["Disetujui Sepenuhnya", "Disetujui Sebagian", "Ditolak"].includes(item.status_verifikasi_kabid) && (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 text-slate-500 dark:text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </span>
                            ) : (
                              <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getKabidStatusBadgeColor('Menunggu')}`}>
                                Menunggu
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right py-3 px-4">
                            <div className="flex justify-end items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetail(item)}
                                className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 px-2 flex items-center"
                              >
                                <span className="mr-1 text-xs">
                                  {selectedPengajuan?.id_pengajuan === item.id_pengajuan ? "Tutup" : "Detail"}
                                </span>
                                {selectedPengajuan?.id_pengajuan === item.id_pengajuan ? 
                                  <ChevronDown className="h-4 w-4" /> : 
                                  <ChevronRight className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditPengajuanDialog(item)}
                                className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 px-2"
                                disabled={isPengajuanLocked()}
                              >
                                Edit
                              </Button>
                              {!isPengajuanLocked() && ( // Hanya tampilkan tombol hapus jika tidak terkunci
                                 <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeletePengajuan(item.id_pengajuan, item.nama_kub)}
                                  className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 px-2"
                                >
                                  Hapus
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Expanded Detail Section - MOVED HERE */}
                        {selectedPengajuan?.id_pengajuan === item.id_pengajuan && (
                          <TableRow className="bg-sky-50/30 dark:bg-slate-700/30">
                            <TableCell colSpan={7}> {/* ColSpan disesuaikan dengan jumlah kolom header (termasuk No.) */}
                              <div className="p-4 md:p-6 bg-sky-50 dark:bg-sky-800/30 border border-sky-200 dark:border-sky-600 rounded-lg shadow-md my-2">
                                {isDetailLoading ? (
                                  <p className="text-center py-4 text-slate-600 dark:text-slate-400">Memuat detail...</p>
                                ) : (
                                  <div>
                                    {/* Content from original right column starts here */}
                                    <div className="mb-6 p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-white dark:bg-slate-700/50">
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <h3 className="font-medium text-lg text-slate-800 dark:text-slate-100">{selectedPengajuan.nama_kub}</h3>
                                          <div className="text-sm mt-1 text-slate-600 dark:text-slate-300">
                                            <span className="font-medium text-slate-700 dark:text-slate-200">Alamat KUB:</span>{' '}
                                        {selectedPengajuan.alamat_kub || '-'}
                                          </div>
                                          <div className="text-sm text-slate-600 dark:text-slate-300">
                                            <span className="font-medium text-slate-700 dark:text-slate-200">Kabupaten/Kota:</span>{' '}
                                        {selectedPengajuan.kabupaten_kota || '-'}
                                          </div>
                                          <div className="text-sm text-slate-600 dark:text-slate-300">
                                            <span className="font-medium text-slate-700 dark:text-slate-200">Wilayah Penangkapan:</span>{' '}
                                            {selectedPengajuan.wilayah_penangkapan === 'perairan_umum_daratan' ? 'Perairan Daratan' : 'Laut'}
                                          </div>
                                          <div className="text-sm text-slate-600 dark:text-slate-300">
                                            <span className="font-medium text-slate-700 dark:text-slate-200">Tanggal Pengajuan:</span>{' '}
                                            {new Date(selectedPengajuan.tanggal_pengajuan).toLocaleDateString('id-ID', {
                                              day: 'numeric', month: 'long', year: 'numeric'
                                            })}
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-end flex-shrink-0 ml-4">
                                          <span className={`text-sm px-2 py-1 rounded-full ${getStatusBadgeColor(selectedPengajuan.status_verifikasi || 'Menunggu')}`}>
                                            Admin: {selectedPengajuan.status_verifikasi || 'Menunggu'}
                                          </span>
                                          {selectedPengajuan.status_verifikasi_kabid && (
                                            <span className={`text-sm px-2 py-1 rounded-full mt-1.5 ${getKabidStatusBadgeColor(selectedPengajuan.status_verifikasi_kabid)}`}>
                                              Kabid: {selectedPengajuan.status_verifikasi_kabid}
                                            </span>
                                          )}
                                          {isPengajuanLocked() && (
                                            <span className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex items-center">
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-slate-400 dark:text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                              </svg>
                                              Terkunci
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex space-x-4 mt-3 pt-3 border-t border-sky-200 dark:border-sky-600">
                                        <button
                                          onClick={handlePreviewDocument}
                                          className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 text-sm underline"
                                        >
                                          Lihat Dokumen Pengajuan
                                        </button>
                                      </div>
                                    </div>

                                    {/* Detail Usulan Section */}
                                    <div className="mb-6 p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-white dark:bg-slate-700/50">
                                      <h3 className="font-medium mb-3 text-slate-700 dark:text-slate-200">Detail Usulan Alat Tangkap</h3>
                                      <div className="overflow-x-auto rounded-lg shadow-sm border border-sky-200 dark:border-sky-700">
                                        <table className="min-w-full bg-white dark:bg-slate-800 ">
                                          {/* TableHeader disesuaikan dengan tema flat */}
                                          <thead className="bg-sky-100 dark:bg-sky-700/50">
                                            <tr>
                                              <th className="py-3 px-4 text-left text-xs font-medium text-sky-700 dark:text-sky-200 uppercase tracking-wider">Nama Alat</th>
                                              <th className="py-3 px-4 text-left text-xs font-medium text-sky-700 dark:text-sky-200 uppercase tracking-wider">Jumlah</th>
                                              <th className="py-3 px-4 text-left text-xs font-medium text-sky-700 dark:text-sky-200 uppercase tracking-wider">Harga Satuan</th>
                                              <th className="py-3 px-4 text-left text-xs font-medium text-sky-700 dark:text-sky-200 uppercase tracking-wider">Harga Total</th>
                                              <th className="py-3 px-4 text-right text-xs font-medium text-sky-700 dark:text-sky-200 uppercase tracking-wider">Aksi</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-sky-100 dark:divide-sky-800">
                                            {detailUsulan.length > 0 ? detailUsulan.map((item_detail: DetailUsulan) => ( 
                                              <tr key={item_detail.id_detail_usulan} className="hover:bg-sky-50 dark:hover:bg-sky-900/50 transition-colors duration-150">
                                                <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
                                                  {item_detail.nama_alat}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
                                                  {isEditingItem === item_detail.id_detail_usulan && editItemData ? (
                                                    <input
                                                      type="number"
                                                      min="1"
                                                      value={editItemData.jumlah_alat}
                                                      onChange={(e) => {
                                                        const jumlahAlat = parseInt(e.target.value) || 1;
                                                        setEditItemData({
                                                          ...editItemData,
                                                          jumlah_alat: jumlahAlat,
                                                          harga_total: jumlahAlat * (editItemData.harga_satuan || 0)
                                                        });
                                                      }}
                                                      className="w-20 border border-sky-300 dark:border-sky-600 px-2 py-1 rounded text-sm bg-white dark:bg-slate-700 focus:ring-sky-500 focus:border-sky-500 text-slate-900 dark:text-slate-100"
                                                    />
                                                  ) : (
                                                    item_detail.jumlah_alat
                                                  )}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
                                                  {isEditingItem === item_detail.id_detail_usulan && editItemData ? (
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      value={editItemData.harga_satuan}
                                                      onChange={(e) => {
                                                        const hargaSatuan = parseInt(e.target.value) || 0;
                                                        setEditItemData({
                                                          ...editItemData,
                                                          harga_satuan: hargaSatuan,
                                                          harga_total: (editItemData.jumlah_alat) * hargaSatuan
                                                        });
                                                      }}
                                                      className="w-32 border border-sky-300 dark:border-sky-600 px-2 py-1 rounded text-sm bg-white dark:bg-slate-700 focus:ring-sky-500 focus:border-sky-500 text-slate-900 dark:text-slate-100"
                                                    />
                                                  ) : (
                                                    new Intl.NumberFormat('id-ID', {
                                                      style: 'currency',
                                                      currency: 'IDR',
                                                      minimumFractionDigits: 0
                                                    }).format(item_detail.harga_satuan || 0)
                                                  )}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
                                                  {new Intl.NumberFormat('id-ID', {
                                                    style: 'currency',
                                                    currency: 'IDR',
                                                    minimumFractionDigits: 0
                                                  }).format(
                                                    isEditingItem === item_detail.id_detail_usulan && editItemData
                                                      ? (editItemData.harga_total || editItemData.jumlah_alat * (editItemData.harga_satuan || 0))
                                                      : (item_detail.harga_total || item_detail.jumlah_alat * (item_detail.harga_satuan || 0) || 0)
                                                  )}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-right">
                                                  {isEditingItem === item_detail.id_detail_usulan ? (
                                                    <div className="flex justify-end space-x-2">
                                                      <button
                                                        onClick={saveEditItem}
                                                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm"
                                                      >
                                                        Simpan
                                                      </button>
                                                      <button
                                                        onClick={cancelEditItem}
                                                        className="text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 text-sm"
                                                      >
                                                        Batal
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <div className="flex justify-end space-x-2">
                                                      {!isPengajuanLocked() ? (
                                                        <>
                                                          <button
                                                            onClick={() => startEditItem(item_detail)}
                                                            className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 text-sm"
                                                          >
                                                            Edit
                                                          </button>
                                                          <button
                                                            onClick={() => handleDeleteItem(item_detail.id_detail_usulan)}
                                                            className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 text-sm"
                                                          >
                                                            Hapus
                                                          </button>
                                                        </>
                                                      ) : (
                                                        <span className="text-slate-500 dark:text-slate-400 text-sm">Terkunci</span>
                                                      )
                                                     }
                                                    </div>
                                                  )}
                                                </td>
                                              </tr>
                                            )) : (
                                              <tr>
                                                <td colSpan={5} className="py-4 px-4 text-center text-sm text-slate-500 dark:text-slate-400">
                                                  Tidak ada detail usulan.
                                                </td>
                                              </tr>
                                            )}
                                            <tr className="bg-slate-50 dark:bg-slate-700/50">
                                              <td colSpan={3} className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-200">
                                                Total Keseluruhan:
                                              </td>
                                              <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-200">
                                                {new Intl.NumberFormat('id-ID', {
                                                  style: 'currency',
                                                  currency: 'IDR',
                                                  minimumFractionDigits: 0
                                                }).format(detailUsulan.reduce((total, item_detail_reduce) => {
                                                  let itemTotal = item_detail_reduce.harga_total || item_detail_reduce.jumlah_alat * (item_detail_reduce.harga_satuan || 0) || 0;
                                                  if (isEditingItem === item_detail_reduce.id_detail_usulan && editItemData) {
                                                    itemTotal = editItemData.harga_total || 
                                                      editItemData.jumlah_alat * (editItemData.harga_satuan || 0) || 0;
                                                  }
                                                  return total + itemTotal;
                                                }, 0))}
                                              </td>
                                              <td className="py-3 px-4"></td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>

                                    {/* Anggota Kelompok Section */}
                                    <div className="mb-6 p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-white dark:bg-slate-700/50">
                                      <h3 className="font-medium mb-3 text-slate-700 dark:text-slate-200">Detail Anggota Kelompok</h3>
                                      <div className="overflow-x-auto rounded-lg shadow-sm border border-sky-200 dark:border-sky-700">
                                        <table className="min-w-full bg-white dark:bg-slate-800">
                                          {/* TableHeader disesuaikan dengan tema flat */}
                                          <thead className="bg-sky-100 dark:bg-sky-700/50">
                                            <tr>
                                              <th className="py-3 px-4 text-left text-xs font-medium text-sky-700 dark:text-sky-200 uppercase tracking-wider">Nama</th>
                                              <th className="py-3 px-4 text-left text-xs font-medium text-sky-700 dark:text-sky-200 uppercase tracking-wider">Jabatan</th>
                                              <th className="py-3 px-4 text-left text-xs font-medium text-sky-700 dark:text-sky-200 uppercase tracking-wider">NIK</th>
                                              <th className="py-3 px-4 text-left text-xs font-medium text-sky-700 dark:text-sky-200 uppercase tracking-wider">No. Kusuka</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-teal-100 dark:divide-teal-800">
                                            {anggotaKelompok.length > 0 ? anggotaKelompok.map((anggota: AnggotaKelompok) => ( 
                                              <tr key={anggota.id_anggota} className="hover:bg-teal-50 dark:hover:bg-teal-900/50 transition-colors duration-150">
                                                <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">{anggota.nama_anggota}</td>
                                                <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300 capitalize">{anggota.jabatan}</td>
                                                <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">{anggota.nik}</td>
                                                <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">{anggota.no_kusuka}</td>
                                              </tr>
                                            )) : (
                                              <tr>
                                                <td colSpan={4} className="py-4 px-4 text-center text-sm text-slate-500 dark:text-slate-400">
                                                  Tidak ada data anggota.
                                                </td>
                                              </tr>
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>

                                    {/* Verifikasi Dokumen Section */}
                                    <div className="mb-6 p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-white dark:bg-slate-700/50">
                                      <h3 className="font-medium mb-3 text-slate-700 dark:text-slate-200">Verifikasi Dokumen</h3>
                                      <div className="grid grid-cols-2 gap-2 mb-4">
                                        {/* ...checkboxes for dokumenChecklist... */}
                                          <label className={`flex items-center text-sm text-slate-700 dark:text-slate-300 ${isPengajuanLocked() ? 'cursor-not-allowed opacity-70' : ''}`}>
                                            <input type="checkbox" checked={dokumenChecklist.proposal} onChange={() => handleChecklistChange('proposal')} className="mr-2" disabled={isPengajuanLocked()} />
                                            <span>Proposal</span>
                                          </label>
                                          <label className={`flex items-center text-sm text-slate-700 dark:text-slate-300 ${isPengajuanLocked() ? 'cursor-not-allowed opacity-70' : ''}`}>
                                            <input type="checkbox" checked={dokumenChecklist.surat_usulan} onChange={() => handleChecklistChange('surat_usulan')} className="mr-2" disabled={isPengajuanLocked()} />
                                            <span>Surat Usulan</span>
                                          </label>
                                          <label className={`flex items-center text-sm text-slate-700 dark:text-slate-300 ${isPengajuanLocked() ? 'cursor-not-allowed opacity-70' : ''}`}>
                                            <input type="checkbox" checked={dokumenChecklist.foto_ktp} onChange={() => handleChecklistChange('foto_ktp')} className="mr-2" disabled={isPengajuanLocked()} />
                                            <span>Foto KTP</span>
                                          </label>
                                          <label className={`flex items-center text-sm text-slate-700 dark:text-slate-300 ${isPengajuanLocked() ? 'cursor-not-allowed opacity-70' : ''}`}>
                                            <input type="checkbox" checked={dokumenChecklist.surat_ktm} onChange={() => handleChecklistChange('surat_ktm')} className="mr-2" disabled={isPengajuanLocked()} />
                                            <span>Surat KTM</span>
                                          </label>
                                          <label className={`flex items-center text-sm text-slate-700 dark:text-slate-300 ${isPengajuanLocked() ? 'cursor-not-allowed opacity-70' : ''}`}>
                                            <input type="checkbox" checked={dokumenChecklist.foto_rumah} onChange={() => handleChecklistChange('foto_rumah')} className="mr-2" disabled={isPengajuanLocked()} />
                                            <span>Foto Rumah</span>
                                          </label>
                                          <label className={`flex items-center text-sm text-slate-700 dark:text-slate-300 ${isPengajuanLocked() ? 'cursor-not-allowed opacity-70' : ''}`}>
                                            <input type="checkbox" checked={dokumenChecklist.foto_alat_tangkap} onChange={() => handleChecklistChange('foto_alat_tangkap')} className="mr-2" disabled={isPengajuanLocked()} />
                                            <span>Foto Alat Tangkap</span>
                                          </label>
                                          <label className={`flex items-center text-sm text-slate-700 dark:text-slate-300 ${isPengajuanLocked() ? 'cursor-not-allowed opacity-70' : ''}`}>
                                            <input type="checkbox" checked={dokumenChecklist.kartu_kusuka} onChange={() => handleChecklistChange('kartu_kusuka')} className="mr-2" disabled={isPengajuanLocked()} />
                                            <span>Kartu Kusuka</span>
                                          </label>
                                          <label className={`flex items-center text-sm text-slate-700 dark:text-slate-300 ${isPengajuanLocked() ? 'cursor-not-allowed opacity-70' : ''}`}>
                                            <input type="checkbox" checked={dokumenChecklist.foto_kapal} onChange={() => handleChecklistChange('foto_kapal')} className="mr-2" disabled={isPengajuanLocked()} />
                                            <span>Foto Kapal</span>
                                          </label>
                                          <label className={`flex items-center text-sm text-slate-700 dark:text-slate-300 ${isPengajuanLocked() ? 'cursor-not-allowed opacity-70' : ''}`}>
                                            <input type="checkbox" checked={dokumenChecklist.bpjs} onChange={() => handleChecklistChange('bpjs')} className="mr-2" disabled={isPengajuanLocked()} />
                                            <span>BPJS (Opsional)</span>
                                          </label>
                                          <label className={`flex items-center text-sm text-slate-700 dark:text-slate-300 ${isPengajuanLocked() ? 'cursor-not-allowed opacity-70' : ''}`}>
                                            <input type="checkbox" checked={dokumenChecklist.kis} onChange={() => handleChecklistChange('kis')} className="mr-2" disabled={isPengajuanLocked()} />
                                            <span>KIS (Opsional)</span>
                                          </label>
                                      </div>
                                    </div>

                                    {/* Informasi BAST Section */}
                                    <div className="mb-6 p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-white dark:bg-slate-700/50">
                                      <h3 className="font-medium mb-3 text-slate-700 dark:text-slate-200">Informasi BAST</h3>
                                      {/* ...noBastInput, bastFile input, preview BAST button... */}
                                        <div className="mb-3">
                                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">No. BAST</label>
                                          <input type="text" value={noBastInput} onChange={(e) => setNoBastInput(e.target.value)} placeholder="Masukkan Nomor BAST" className="w-full px-3 py-2 border border-sky-300 dark:border-sky-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500 transition-colors" disabled={isPengajuanLocked()} />
                                        </div>
                                        <div className="mb-3">
                                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Upload Dokumen BAST (PDF)</label>
                                          <input type="file" onChange={(e) => setBastFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-100 file:text-sky-700 hover:file:bg-sky-200 dark:file:bg-sky-800 dark:file:text-sky-100 dark:hover:file:bg-sky-700" accept=".pdf" disabled={isPengajuanLocked()} />
                                        </div>
                                        {selectedPengajuan.dokumen_bast && (
                                          <button onClick={handlePreviewBastDocument} className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 text-sm underline">Lihat Dokumen BAST</button>
                                        )}
                                    </div>

                                    {/* Status Verifikasi Section */}
                                    <div className="p-4 border border-sky-200 dark:border-sky-700 rounded-lg bg-white dark:bg-slate-700/50">
                                      <h3 className="font-medium mb-3 text-slate-700 dark:text-slate-200">Status Verifikasi & Catatan</h3>
                                      {/* ...statusVerifikasi select, catatan textarea, saveVerification button... */}
                                        <div className="mb-3">
                                          <select value={statusVerifikasi} onChange={(e) => setStatusVerifikasi(e.target.value)} className="w-full px-3 py-2 border border-sky-300 dark:border-sky-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500 transition-colors" disabled={isPengajuanLocked()}>
                                            {statusOptions.map((option) => (<option key={option} value={option}>{option}</option>))}
                                          </select>
                                        </div>
                                        <div className="mb-3">
                                          <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan verifikasi (opsional)..." className="w-full px-3 py-2 border border-sky-300 dark:border-sky-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-sky-500 focus:border-sky-500 transition-colors" rows={3} disabled={isPengajuanLocked()}></textarea>
                                        </div>
                                        <button onClick={saveVerification} className={`px-4 py-2 ${isPengajuanLocked() ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600'} text-white rounded-lg transition-colors`} disabled={isPengajuanLocked()}>
                                          Simpan Perubahan
                                        </button>
                                        {isPengajuanLocked() && (
                                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-slate-400 dark:text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                            Status verifikasi terkunci karena sudah diverifikasi oleh Kepala Bidang
                                          </p>
                                        )}
                                    </div>
                                    {/* End of content from original right column */}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-slate-500 dark:text-slate-400"> {/* ColSpan disesuaikan */}
                          Tidak ada data pengajuan yang sesuai dengan filter.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination Controls - Diaktifkan kembali */}
              {filteredPengajuanList.length > ITEMS_PER_PAGE && (
                <div className="mt-4 pt-4 flex justify-between items-center border-t border-sky-200 dark:border-sky-700">
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="outline"
                    className="text-sm px-3 py-1.5 border-sky-300 dark:border-sky-600 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sebelumnya
                  </Button>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    className="text-sm px-3 py-1.5 border-sky-300 dark:border-sky-600 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Berikutnya
                  </Button>
                </div>
              )}
            </>
          )}
      </div>

    </main>

      {/* Document Preview Modal */}
      {showModal && dokumenUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl w-11/12 md:w-5/6 lg:w-11/12 max-h-[95vh] flex flex-col shadow-2xl border border-sky-200 dark:border-sky-700">
            <div className="flex justify-between items-center p-4 border-b border-sky-200 dark:border-sky-700">
              <h3 className="font-semibold text-lg text-sky-700 dark:text-sky-200">Dokumen Pengajuan</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setDokumenUrl(null);
                }}
                className="text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 transition-colors p-1 rounded-full hover:bg-sky-100 dark:hover:bg-sky-700"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <iframe
                src={dokumenUrl}
                className="w-full h-[80vh] border border-sky-200 dark:border-sky-700 rounded"
                title="Document Preview"
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* BAST Document Preview Modal */}
      {showBastModal && bastDokumenUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl w-full sm:w-11/12 md:w-5/6 lg:w-11/12 max-h-[95vh] flex flex-col shadow-2xl border border-sky-200 dark:border-sky-700">
            <div className="flex justify-between items-center p-4 border-b border-sky-200 dark:border-sky-700">
              <h3 className="font-semibold text-lg text-sky-700 dark:text-sky-200">Dokumen BAST</h3>
              <button
                onClick={() => {
                  setShowBastModal(false);
                  setBastDokumenUrl(null);
                }}
                className="text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 transition-colors p-1 rounded-full hover:bg-sky-100 dark:hover:bg-sky-700"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <iframe
                src={bastDokumenUrl}
                className="w-full h-[80vh] border border-sky-200 dark:border-sky-700 rounded"
                title="BAST Document Preview"
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Edit Pengajuan Modal/Dialog */}
      {isEditPengajuanModalOpen && currentEditingPengajuan && (
        <Dialog open={isEditPengajuanModalOpen} onOpenChange={setIsEditPengajuanModalOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="text-sky-700 dark:text-sky-300">Edit Pengajuan - {currentEditingPengajuan.nama_kub}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveEditedPengajuan}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="tanggal_pengajuan_edit" className="text-slate-700 dark:text-slate-300">Tanggal Pengajuan</Label>
                  <Input
                    id="tanggal_pengajuan_edit"
                    name="tanggal_pengajuan"
                    type="date"
                    value={editPengajuanFormData.tanggal_pengajuan}
                    onChange={handleEditPengajuanInputChange}
                    className="mt-1 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                <div>
                  <Label htmlFor="wilayah_penangkapan_edit" className="text-slate-700 dark:text-slate-300">Wilayah Penangkapan</Label>
                  <select
                    id="wilayah_penangkapan_edit"
                    name="wilayah_penangkapan"
                    value={editPengajuanFormData.wilayah_penangkapan}
                    onChange={handleEditPengajuanInputChange}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-sm focus:ring-sky-500 focus:border-sky-500"
                  >
                    <option value="">Pilih Wilayah</option>
                    <option value="perairan_umum_daratan">Perairan Umum Daratan</option>
                    <option value="laut">Laut</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="alamat_kub_edit" className="text-slate-700 dark:text-slate-300">Alamat KUB</Label>
                  <Input // Atau bisa menggunakan <textarea> jika alamatnya panjang
                    id="alamat_kub_edit"
                    name="alamat_kub"
                    type="text"
                    value={editPengajuanFormData.alamat_kub}
                    onChange={handleEditPengajuanInputChange}
                    className="mt-1 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                <div>
                  <Label htmlFor="kabupaten_kota_edit" className="text-slate-700 dark:text-slate-300">Kabupaten/Kota KUB</Label>
                  <select
                    id="kabupaten_kota_edit"
                    name="kabupaten_kota"
                    value={editPengajuanFormData.kabupaten_kota}
                    onChange={handleEditPengajuanInputChange}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-sm focus:ring-sky-500 focus:border-sky-500"
                  >
                    <option value="">Pilih Kabupaten/Kota</option>
                    {availableKabupatenKota.map(kab => <option key={kab} value={kab}>{kab}</option>)}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditPengajuanModalOpen(false)} className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                  Batal
                </Button>
                <Button type="submit" className="bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white">
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}


      {/* Footer - Ditambahkan untuk konsistensi */}
      <footer className="py-4 text-center text-sm text-slate-500 dark:text-slate-400 border-t border-sky-200 dark:border-sky-700">
        
      </footer>
    </div>
  );
}
