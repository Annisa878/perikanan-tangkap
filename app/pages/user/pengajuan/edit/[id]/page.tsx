"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

// Define types for form data
interface FormData {
  nama_kub: string;
  alamat_kub: string; 
  kabupaten_kota: string; 
  wilayah_penangkapan: "perairan_umum_daratan" | "laut" | "";
  dokumen_pengajuan: File | null;
  currentDokumenPath: string | null;
  tanggal_pengajuan: string; 
  nama_alat_lainnya: string;
  nama_alat: string; // Added
  jumlah_alat: number; // Added
}

interface AnggotaData {
  id_anggota?: string;
  kelompok_id: string;
  nama_anggota: string;
  jabatan: string;
  nik: string;
  no_kusuka: string;
}

interface UsulanItem {
  id_detail_usulan?: string;
  pengajuan_id?: string;
  nama_alat: string;
  jumlah_alat: number;
}

interface Pengajuan {
  id_pengajuan: string;
  kelompok_id: string;
  kelompok?: { 
    nama_kub: string;
    alamat_kub?: string; 
    kabupaten_kota?: string; 
  };
  wilayah_penangkapan: string;
  dokumen_pengajuan: string;
  status_verifikasi: string;
  catatan_verifikasi: string | null;
  tanggal_pengajuan?: string; 
}

export default function PengajuanEditForm() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  // State for pengajuan data
  const [pengajuan, setPengajuan] = useState<Pengajuan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Equipment lists based on area
  const perairan_umum_daratan = [
    "Mesin Perahu", "Perahu", "Jaring", 
    "Jala Tebar", "Bubu", "Coolbox", 
    "Empang", "Jaket Pelampung", "Kompas"
  ];
  
  const laut = [
    "Mesin Perahu", "Perahu", "Jaring", 
    "Jala Tebar", "Bubu", "Coolbox", 
    "Empang", "Jaket Pelampung", "Kompas"
  ];
  
  // Form data states
  const [formData, setFormData] = useState<FormData>({
    nama_kub: "",
    alamat_kub: "", 
    kabupaten_kota: "", 
    wilayah_penangkapan: "",
    dokumen_pengajuan: null,
    currentDokumenPath: null,
    tanggal_pengajuan: new Date().toISOString().split('T')[0], 
    nama_alat_lainnya: "",
    nama_alat: "", // Initialize
    jumlah_alat: 1, // Initialize
  });
  
  const [alatTangkapList, setAlatTangkapList] = useState<string[]>([]);
  const [tempAlatTangkap, setTempAlatTangkap] = useState<string>("");
  const [tempJumlahAlat, setTempJumlahAlat] = useState<number>(1);
  const [usulanItems, setUsulanItems] = useState<UsulanItem[]>([]);
  const [editingUsulanIndex, setEditingUsulanIndex] = useState<number | null>(null); 
  const [anggotaList, setAnggotaList] = useState<AnggotaData[]>([]);
  const [newAnggota, setNewAnggota] = useState<AnggotaData>({
    kelompok_id: "",
    nama_anggota: "",
    jabatan: "", 
    nik: "",
    no_kusuka: ""
  });
  const [editingAnggotaIndex, setEditingAnggotaIndex] = useState<number | null>(null);

  // Effect to fetch pengajuan data
  useEffect(() => {
    const fetchPengajuanData = async () => {
      try {
        const id = params.id;
        if (!id) {
          setError("ID Pengajuan tidak ditemukan");
          setIsLoading(false);
          return;
        }

        // Get current user
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error("Authentication error");
        
        if (!userData?.user) {
          setError("Anda harus login terlebih dahulu");
          setIsLoading(false);
          return;
        }

        // Fetch pengajuan data
        const { data: pengajuanData, error: pengajuanError } = await supabase
          .from("pengajuan")
          .select(`
            *,
            kelompok:kelompok_id (
              nama_kub,
              alamat_kub,
              kabupaten_kota
            )
          `)
          .eq('id_pengajuan', id)
          .single();

        if (pengajuanError) throw pengajuanError;
        if (!pengajuanData) throw new Error("Pengajuan tidak ditemukan");
        
        // Check if pengajuan can be edited
        const editableStatuses = ["Menunggu", "Ditolak", "Perlu Revisi"];
        if (!editableStatuses.includes(pengajuanData.status_verifikasi)) {
          setError("Pengajuan ini tidak dapat diedit karena sudah " + pengajuanData.status_verifikasi);
          setIsLoading(false);
          return;
        }

        setPengajuan(pengajuanData);
        
        // Update form data
        setFormData({
          nama_kub: pengajuanData.kelompok?.nama_kub || "", 
          alamat_kub: pengajuanData.kelompok?.alamat_kub || "", 
          kabupaten_kota: pengajuanData.kelompok?.kabupaten_kota || "", 
          wilayah_penangkapan: pengajuanData.wilayah_penangkapan,
          dokumen_pengajuan: null,
          currentDokumenPath: pengajuanData.dokumen_pengajuan,
          tanggal_pengajuan: pengajuanData.tanggal_pengajuan || new Date().toISOString().split('T')[0], 
          nama_alat_lainnya: "",
          nama_alat: "", // Initialize with default
          jumlah_alat: 1, // Initialize with default
        });

        // Set alat tangkap list based on wilayah
        let initialAlatList: string[] = [];
        if (pengajuanData.wilayah_penangkapan === "perairan_umum_daratan") {
          initialAlatList = perairan_umum_daratan;
        } else if (pengajuanData.wilayah_penangkapan === "laut") {
          initialAlatList = laut;
        }
        const fullAlatList = initialAlatList.length > 0 ? [...initialAlatList, "Lainnya"] : [];
        setAlatTangkapList(fullAlatList);
        setTempAlatTangkap(initialAlatList.length > 0 ? initialAlatList[0] : "");

        // Fetch detail usulan
        const { data: detailData, error: detailError } = await supabase
          .from("detail_usulan")
          .select("*")
          .eq('pengajuan_id', id);

        if (detailError) throw detailError;
        setUsulanItems(detailData || []);
        
        // Fetch anggota kelompok
        const { data: anggotaData, error: anggotaError } = await supabase
          .from("anggota_kelompok")
          .select("*")
          .eq('kelompok_id', pengajuanData.kelompok_id);

        if (anggotaError) throw anggotaError;
        setAnggotaList(anggotaData || []);
        
        // Set new anggota kelompok_id
        setNewAnggota(prev => ({
          ...prev,
          kelompok_id: pengajuanData.kelompok_id
        }));
        
      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching pengajuan data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPengajuanData();
  }, [params]);
  
  // Effect to update available fishing equipment when area changes
  useEffect(() => {
    if (formData.wilayah_penangkapan === "perairan_umum_daratan") {
      const fullList = [...perairan_umum_daratan, "Lainnya"];
      setAlatTangkapList(fullList);
      setTempAlatTangkap(perairan_umum_daratan[0] || "");
    } else if (formData.wilayah_penangkapan === "laut") {
      const fullList = [...laut, "Lainnya"];
      setAlatTangkapList(fullList);
      setTempAlatTangkap(laut[0] || "");
    } else {
      setAlatTangkapList([]);
      setTempAlatTangkap("");
    }
    // Reset nama_alat_lainnya when wilayah changes and nama_alat is not "Lainnya"
    setFormData(prev => ({
        ...prev,
        nama_alat_lainnya: prev.nama_alat === "Lainnya" ? prev.nama_alat_lainnya : ""
    }));
  }, [formData.wilayah_penangkapan]);

  // Handle input changes for form data
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAlatInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value, nama_alat_lainnya: name === 'nama_alat' && value !== 'Lainnya' ? '' : prev.nama_alat_lainnya }));
    if (name === 'nama_alat') setTempAlatTangkap(value); // Sync tempAlatTangkap
  };
  
  // Handle radio button changes
  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData({ ...formData, dokumen_pengajuan: file });
  };
  
  // Functions for usulan items
  const handleAlatTangkapChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setTempAlatTangkap(value);
    // Also update formData if this select is directly tied to it
    setFormData(prev => ({ ...prev, nama_alat: value, nama_alat_lainnya: value !== "Lainnya" ? "" : prev.nama_alat_lainnya }));
  };
  
  const handleJumlahAlatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    setTempJumlahAlat(value);
    // Also update formData if this input is directly tied to it
    setFormData(prev => ({ ...prev, jumlah_alat: value }));
  };
  
  const addUsulanItem = () => {
    const alatYangDiinput = formData.nama_alat === "Lainnya" ? formData.nama_alat_lainnya.trim() : formData.nama_alat;

    if (!alatYangDiinput) {
      alert("Alat tangkap harus dipilih!");
      return;
    }
    
    if (editingUsulanIndex === null && usulanItems.some(item => item.nama_alat === alatYangDiinput)) {
      alert("Alat tangkap ini sudah ditambahkan!");
      return;
    }
    
    const newItem = {
        nama_alat: alatYangDiinput,
        jumlah_alat: formData.jumlah_alat, // Use formData.jumlah_alat
    };

    if (editingUsulanIndex !== null) {
      const updatedItems = [...usulanItems];
      // Check for duplicates only if name changed or it's a new item
      if (updatedItems.some((item, idx) => item.nama_alat === alatYangDiinput && idx !== editingUsulanIndex)) {
        alert("Alat tangkap dengan nama ini sudah ada dalam daftar!");
        return;
      }
      updatedItems[editingUsulanIndex] = newItem;
      setUsulanItems(updatedItems);
      setEditingUsulanIndex(null);
    } else {
      setUsulanItems([...usulanItems, newItem]);
    }
    
    // Reset form fields for next input, using the first actual tool from the list
    const firstActualTool = alatTangkapList.find(alat => alat !== "Lainnya") || "";
    setFormData(prev => ({
      ...prev,
      nama_alat: firstActualTool,
      nama_alat_lainnya: "",
      jumlah_alat: 1,
    }));
    setTempAlatTangkap(firstActualTool); 
    setTempJumlahAlat(1); 
  };
  
  const removeUsulanItem = (index: number) => {
    const updatedItems = [...usulanItems];
    updatedItems.splice(index, 1);
    setUsulanItems(updatedItems);
  };

  const handleEditUsulanItem = (index: number) => {
    const itemToEdit = usulanItems[index];
    setEditingUsulanIndex(index);
    setFormData(prevFormData => ({
      ...prevFormData,
      nama_alat: alatTangkapList.includes(itemToEdit.nama_alat) ? itemToEdit.nama_alat : "Lainnya",
      nama_alat_lainnya: alatTangkapList.includes(itemToEdit.nama_alat) ? "" : itemToEdit.nama_alat,
      jumlah_alat: itemToEdit.jumlah_alat,
    }));
    setTempAlatTangkap(alatTangkapList.includes(itemToEdit.nama_alat) ? itemToEdit.nama_alat : "Lainnya");
    setTempJumlahAlat(itemToEdit.jumlah_alat);
  };

  const handleCancelEditUsulan = () => {
    setEditingUsulanIndex(null);
    const firstActualTool = alatTangkapList.find(alat => alat !== "Lainnya") || "";
    setFormData(prev => ({ ...prev, nama_alat: firstActualTool, nama_alat_lainnya: "", jumlah_alat: 1 }));
    setTempAlatTangkap(firstActualTool);
    setTempJumlahAlat(1);
  };
  
  // Functions for anggota management
  const handleNewAnggotaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewAnggota({ ...newAnggota, [e.target.name]: e.target.value });
  };
  
  const addAnggota = () => {
    // Validate inputs first
    if (!newAnggota.nama_anggota || !newAnggota.no_kusuka || !newAnggota.nik || !newAnggota.jabatan) {
      alert("Nama anggota, NIK, nomor KUSUKA dan Jabatan harus diisi!");
      return;
    }
    
    // Check if we already have a Ketua
    if (newAnggota.jabatan === "ketua" && 
        anggotaList.some(anggota => anggota.jabatan === "ketua" )) {
      alert("Ketua kelompok sudah ada!");
      return;
    }
    
    // Add to the list
    setAnggotaList([...anggotaList, { ...newAnggota }]);
    
    // Reset form for next input
    setNewAnggota({
      ...newAnggota,
      nama_anggota: "",
      jabatan: "", 
      nik: "",
      no_kusuka: ""
    });
  };
  
  const removeAnggota = (index: number) => {
    const updatedAnggotaList = [...anggotaList];
    updatedAnggotaList.splice(index, 1);
    setAnggotaList(updatedAnggotaList);
  };
  
  const editAnggota = (index: number) => {
    setEditingAnggotaIndex(index);
    const anggota = anggotaList[index];
    setNewAnggota({ ...anggota });
  };
  
  const updateAnggota = () => {
    // Validate inputs first
    if (!newAnggota.nama_anggota || !newAnggota.no_kusuka || !newAnggota.nik || !newAnggota.jabatan) {
      alert("Nama anggota, NIK, nomor KUSUKA dan Jabatan harus diisi!");
      return;
    }
    
    // Check if we're changing to Ketua and there's already a Ketua
    if (newAnggota.jabatan === "ketua") {
      const ketua = anggotaList.findIndex((anggota, idx) => 
        idx !== editingAnggotaIndex && anggota.jabatan === "ketua"
      );
      
      if (ketua !== -1) {
        alert("Ketua kelompok sudah ada!");
        return;
      }
    }
    
    if (editingAnggotaIndex !== null) {
      const updatedAnggotaList = [...anggotaList];
      updatedAnggotaList[editingAnggotaIndex] = { ...newAnggota };
      setAnggotaList(updatedAnggotaList);
      
      // Reset form and editing state
      setNewAnggota({
        kelompok_id: pengajuan?.kelompok_id || "",
        nama_anggota: "",
        jabatan: "", 
        nik: "",
        no_kusuka: ""
      });
      
      setEditingAnggotaIndex(null);
    }
  };
  
  const cancelEdit = () => {
    setEditingAnggotaIndex(null);
    setNewAnggota({
      kelompok_id: pengajuan?.kelompok_id || "",
      nama_anggota: "",
      jabatan: "", 
      nik: "",
      no_kusuka: ""
    });
  };
  
  // Submit form function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess(null);
    setError(null);

    try {
      if (!pengajuan) {
        throw new Error("Data pengajuan tidak ditemukan");
      }

      // Validate required fields
      if (!formData.nama_kub || !formData.alamat_kub || !formData.kabupaten_kota || !formData.wilayah_penangkapan || !formData.tanggal_pengajuan) {
        throw new Error("Nama KUB, Alamat, Kab/Kota, Wilayah Penangkapan dan Tanggal Pengajuan wajib diisi");
      }

      // Validate if we have at least one member
      if (anggotaList.length === 0) {
        throw new Error("Minimal harus ada satu anggota kelompok");
      }
      
      // Validate if we have at least one usulan
      if (usulanItems.length === 0) {
        throw new Error("Minimal harus ada satu usulan alat");
      }

      // Get current user
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) {
        throw new Error("Anda harus login terlebih dahulu");
      }
      
      // Step 1: Update kelompok data
      const { error: kelompokError } = await supabase
        .from("kelompok")
        .update({ 
          nama_kub: formData.nama_kub,
          alamat_kub: formData.alamat_kub, 
          kabupaten_kota: formData.kabupaten_kota, 
        })
        .eq('id_kelompok', pengajuan.kelompok_id);
      
      if (kelompokError) throw kelompokError;
      
      // Step 2: Update anggota kelompok
      // Delete existing anggota first
      const { error: deleteError } = await supabase
        .from("anggota_kelompok")
        .delete()
        .eq('kelompok_id', pengajuan.kelompok_id);
        
      if (deleteError) throw deleteError;
      
      // Then insert new anggota data
      const anggotaData = anggotaList.map(anggota => ({
        kelompok_id: pengajuan.kelompok_id,
        nama_anggota: anggota.nama_anggota,
        jabatan: anggota.jabatan,
        nik: anggota.nik,
        no_kusuka: anggota.no_kusuka
      }));
      
      const { error: anggotaError } = await supabase
        .from("anggota_kelompok")
        .insert(anggotaData);
        
      if (anggotaError) throw anggotaError;
      
      // Step 3: Handle file upload if there's a new file
      let dokumenPath = formData.currentDokumenPath;
      
      if (formData.dokumen_pengajuan) {
        // Delete previous file if exists
        if (dokumenPath) {
          await supabase.storage
            .from("uploads")
            .remove([dokumenPath]);
        }
        
        // Upload new file
        const originalFileName = formData.dokumen_pengajuan.name;
        const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\s+/g, '_');

        const filePath = `kelompok_${pengajuan.kelompok_id}/dokumen_pengajuan/${Date.now()}_${sanitizedFileName}`;
        const { data: fileData, error: fileError } = await supabase.storage
          .from("uploads")
          .upload(filePath, formData.dokumen_pengajuan);
          
        if (fileError) throw fileError;
        if (!fileData || !fileData.path) {
            throw new Error("Gagal mendapatkan path dokumen baru setelah upload.");
        }
        dokumenPath = fileData.path; 
      }
      
      // Step 4: Update pengajuan data
      const { error: pengajuanError } = await supabase
        .from("pengajuan")
        .update({
          wilayah_penangkapan: formData.wilayah_penangkapan,
          tanggal_pengajuan: formData.tanggal_pengajuan, 
          dokumen_pengajuan: dokumenPath,
          status_verifikasi: "Menunggu", // Reset verification status to "Menunggu"
          catatan_verifikasi: null // Clear verification notes
        })
        .eq('id_pengajuan', pengajuan.id_pengajuan);
        
      if (pengajuanError) throw pengajuanError;
      
      // Step 5: Update detail usulan
      // Delete existing detail usulan first
      const { error: deleteUsulanError } = await supabase
        .from("detail_usulan")
        .delete()
        .eq('pengajuan_id', pengajuan.id_pengajuan);
        
      if (deleteUsulanError) throw deleteUsulanError;
      
      // Then insert new detail usulan
      const usulanData = usulanItems.map(item => ({
        pengajuan_id: pengajuan.id_pengajuan,
        nama_alat: item.nama_alat,
        jumlah_alat: item.jumlah_alat
      }));
      
      const { error: usulanError } = await supabase
        .from("detail_usulan")
        .insert(usulanData);
        
      if (usulanError) throw usulanError;
      
      setSuccess("Pengajuan berhasil diperbarui!");
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(`/pages/user/pengajuan/status/detail/${pengajuan.id_pengajuan}`);
      }, 2000);
      
    } catch (err: any) {
      console.error("Error updating pengajuan:", err);
      setError(err.message || "Terjadi kesalahan saat memperbarui pengajuan");
    } finally {
      setIsSaving(false);
    }
  };

  // Function to get file name from path
  const getFileName = (path: string | null) => {
    if (!path) return "";
    // More robust way to remove timestamp: find the first underscore
    const fileNameWithTimestamp = path.substring(path.lastIndexOf('/') + 1);
    const firstUnderscoreIndex = fileNameWithTimestamp.indexOf('_');
    return firstUnderscoreIndex !== -1 ? fileNameWithTimestamp.substring(firstUnderscoreIndex + 1) : fileNameWithTimestamp;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500"></div>
            <p className="mt-2 text-gray-600">Memuat data pengajuan...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow">
        <div className="bg-gradient-to-r from-blue-500 to-teal-400 p-4 rounded-t-lg">
          <h1 className="text-xl font-bold text-white text-center">Edit Pengajuan</h1>
        </div>
        
        <div className="p-6">
          {/* Back button */}
          <div className="mb-6">
            <button 
              onClick={() => router.back()} 
              className="flex items-center text-blue-500 hover:text-blue-700"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Kembali
            </button>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
              <p>{error}</p>
              {error === "Anda harus login terlebih dahulu" && (
                <div className="mt-2">
                  <Link 
                    href="/login" 
                    className="bg-red-600 text-white px-4 py-2 text-sm rounded hover:bg-red-700"
                  >
                    Login
                  </Link>
                </div>
              )}
            </div>
          )}
          
          {/* Success message */}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 p-4 rounded-md">
              <p>{success}</p>
            </div>
          )}
          
          {/* Edit form */}
          {pengajuan && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* KUB Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Informasi KUB</h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama KUB</label>
                  <input
                    type="text"
                    name="nama_kub"
                    value={formData.nama_kub}
                    onChange={handleInputChange}
                    placeholder="Nama KUB"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alamat KUB</label>
                  <textarea
                    name="alamat_kub"
                    value={formData.alamat_kub}
                    onChange={handleInputChange}
                    placeholder="Alamat KUB"
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-200 resize-none"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kabupaten/Kota</label>
                  <input
                    type="text"
                    name="kabupaten_kota"
                    value={formData.kabupaten_kota}
                    onChange={handleInputChange}
                    placeholder="Kabupaten/Kota"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wilayah Penangkapan</label>
                  <div className="flex gap-6">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="wilayah_penangkapan"
                        value="perairan_umum_daratan"
                        checked={formData.wilayah_penangkapan === 'perairan_umum_daratan'}
                        onChange={handleRadioChange}
                        className="mr-2"
                      />
                      <span>Perairan Umum Daratan</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="wilayah_penangkapan"
                        value="laut"
                        checked={formData.wilayah_penangkapan === 'laut'}
                        onChange={handleRadioChange}
                        className="mr-2"
                      />
                      <span>Laut</span>
                    </label>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pengajuan</label>
                  <input
                    type="date"
                    name="tanggal_pengajuan"
                    value={formData.tanggal_pengajuan}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                    required
                  />
                </div>
              </div>
              
              {/* Anggota Kelompok */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Anggota Kelompok</h2>
                
                <div className="mb-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      name="nama_anggota"
                      value={newAnggota.nama_anggota}
                      onChange={handleNewAnggotaChange}
                      placeholder="Nama Anggota"
                      className="px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                    />
                    <select
                      name="jabatan"
                      value={newAnggota.jabatan}
                      onChange={handleNewAnggotaChange}
                      className="px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                    >
                      <option value="" disabled>Pilih Jabatan...</option>
                      <option value="anggota">Anggota</option>
                      <option value="ketua">Ketua</option>
                      <option value="sekretaris">Sekretaris</option>
                      <option value="bendahara">Bendahara</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      name="nik"
                      value={newAnggota.nik}
                      onChange={handleNewAnggotaChange}
                      placeholder="NIK"
                      className="px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                    />
                    <input
                      type="text"
                      name="no_kusuka"
                      value={newAnggota.no_kusuka}
                      onChange={handleNewAnggotaChange}
                      placeholder="No. KUSUKA"
                      className="px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    {editingAnggotaIndex === null ? (
                      <button
                        type="button"
                        onClick={addAnggota}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                      >
                        Tambah Anggota
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={updateAnggota}
                          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                        >
                          Simpan Perubahan
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {anggotaList.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jabatan</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NIK</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. KUSUKA</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {anggotaList.map((anggota, index) => (
                          <tr key={anggota.id_anggota || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{anggota.nama_anggota}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 capitalize">{anggota.jabatan}</td>
<td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{anggota.nik}</td>
<td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{anggota.no_kusuka}</td>
<td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
  <button
    type="button"
    onClick={() => editAnggota(index)}
    className="text-blue-600 hover:text-blue-900 mr-2"
  >
    Edit
  </button>
  <button
    type="button"
    onClick={() => removeAnggota(index)}
    className="text-red-600 hover:text-red-900"
  >
    Hapus
  </button>
</td>
</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md border border-gray-200">
                    Belum ada anggota yang ditambahkan.
                  </div>
                )}
              </div>
              
              {/* Usulan Alat */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Usulan Alat Tangkap</h2>
                
                {formData.wilayah_penangkapan ? (
                  <div className="mb-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div className="md:col-span-2">
                        <select
                          name="nama_alat" 
                          value={formData.nama_alat} 
                          onChange={handleAlatInputChange} 
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                        >
                          <option value="">Pilih Alat</option>
                          {alatTangkapList.map((alat, index) => (
                            <option key={index} value={alat}>{alat}</option>
                          ))}
                        </select>
                        {formData.nama_alat === "Lainnya" && (
                            <input
                              type="text"
                              name="nama_alat_lainnya"
                              value={formData.nama_alat_lainnya}
                              onChange={handleInputChange} 
                              placeholder="Nama alat tangkap lainnya"
                              className="w-full mt-2 px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                              required
                            />
                        )}
                      </div>
                      <div>
                        <input
                          type="number"
                          min="1"
                          name="jumlah_alat" 
                          value={formData.jumlah_alat} 
                          onChange={handleInputChange} 
                          placeholder="Jumlah"
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                       {editingUsulanIndex !== null && (
                          <button
                            type="button"
                            onClick={handleCancelEditUsulan}
                            className="px-4 py-2 mr-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                          >
                            Batal
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={addUsulanItem}
                          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                          {editingUsulanIndex !== null ? 'Update Alat' : 'Tambah Alat'}
                        </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700">
                    Silakan pilih wilayah penangkapan terlebih dahulu.
                  </div>
                )}
                
                {usulanItems.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Alat</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {usulanItems.map((item, index) => (
                          <tr key={item.id_detail_usulan || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{item.nama_alat}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{item.jumlah_alat}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                               <button
                                type="button"
                                onClick={() => handleEditUsulanItem(index)}
                                className="text-blue-600 hover:text-blue-900 mr-2"
                                disabled={editingUsulanIndex === index}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => removeUsulanItem(index)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md border border-gray-200">
                    Belum ada alat yang ditambahkan.
                  </div>
                )}
              </div>
              
              {/* Dokumen Pengajuan */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Dokumen Pengajuan</h2>
                
                {formData.currentDokumenPath && (
                  <div className="mb-4 p-4 flex items-center justify-between bg-blue-50 rounded-md border border-blue-200">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <span className="text-blue-700">{getFileName(formData.currentDokumenPath)}</span>
                    </div>
                  </div>
                )}
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.currentDokumenPath ? 'Ganti Dokumen Pengajuan (PDF)' : 'Dokumen Pengajuan (PDF)'}
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                  />
                  <p className="text-xs text-gray-500 mt-1">Upload dokumen pengajuan dalam format PDF</p>
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSaving ? (
                    <span className="flex items-center">
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                      Menyimpan...
                    </span>
                  ) : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}