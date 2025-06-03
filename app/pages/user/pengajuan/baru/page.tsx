"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

// Define types for form data
interface FormData {
  nama_kub: string;
  alamat_kub: string;
  kabupaten_kota: string;
  wilayah_penangkapan: "perairan_umum_daratan" | "laut" | "";
  dokumen_pengajuan: File | null;
  nama_alat_lainnya: string;
  tanggal_pengajuan: string; // Tambahkan field untuk tanggal pengajuan manual
  nama_alat: string;
  jumlah_alat: number;
}

interface AnggotaData {
  nama_anggota: string;
  jabatan: string;
  nik: string;
  no_kusuka: string;
}

interface UsulanItem {
  nama_alat: string;
  jumlah_alat: number;
}

export default function PengajuanForm() {
  const supabase = createClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingUsulanIndex, setEditingUsulanIndex] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [usulanItems, setUsulanItems] = useState<UsulanItem[]>([]);

  const addUsulanItem = () => {
    const alatYangDiinput = formData.nama_alat === "Lainnya" ? formData.nama_alat_lainnya.trim() : formData.nama_alat;

    if (!alatYangDiinput) {
      alert("Alat tangkap harus dipilih atau diisi jika memilih 'Lainnya'!");
      return;
    }

    if (editingUsulanIndex === null && usulanItems.some(item => item.nama_alat === alatYangDiinput)) {
      alert("Alat tangkap ini sudah ditambahkan!");
      return;
    }

    const newItem = {
        nama_alat: alatYangDiinput,
        jumlah_alat: formData.jumlah_alat,
    };

    if (editingUsulanIndex !== null) {
      const updatedItems = [...usulanItems];
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
    
    const firstActualTool = alatTangkapList.find(alat => alat !== "Lainnya") || "";
    resetUsulanFormFields(firstActualTool);
  };

  const resetUsulanFormFields = (defaultAlat: string) => {
    const firstActualTool = alatTangkapList.find(alat => alat !== "Lainnya") || "";
    setFormData({
      ...formData,
      nama_alat: firstActualTool,
      nama_alat_lainnya: "",
      jumlah_alat: 1,
    });
  };

  const removeUsulanItem = (index: number) => {
    if (usulanItems.length > 0) {
      const updatedItems = [...usulanItems];
      updatedItems.splice(index, 1);
      setUsulanItems(updatedItems);
      if (editingUsulanIndex === index) {
        handleCancelEditUsulan();
      }
    }
  };

  const handleUsulanChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const updatedUsulanItems = [...usulanItems];
    const { name, value } = e.target;
    
    if (name === "jumlah_alat") {
      const jumlah = parseInt(value) || 1;
      updatedUsulanItems[index] = {
        ...updatedUsulanItems[index],
        jumlah_alat: jumlah
      };
    } else if (name === "nama_alat") {
      updatedUsulanItems[index] = {
        ...updatedUsulanItems[index],
        nama_alat: value
      };
    }
    setUsulanItems(updatedUsulanItems);
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
  };

  const handleCancelEditUsulan = () => {
    setEditingUsulanIndex(null);
    const firstActualTool = alatTangkapList.find(alat => alat !== "Lainnya") || "";
    setFormData(prevFormData => ({
      ...prevFormData,
      nama_alat: firstActualTool,
      nama_alat_lainnya: "",
      jumlah_alat: 1,
    }));
  };
  
  const [formData, setFormData] = useState<FormData>({
    nama_kub: "",
    alamat_kub: "",
    kabupaten_kota: "",
    wilayah_penangkapan: "",
    tanggal_pengajuan: new Date().toISOString().split('T')[0], // Default ke tanggal hari ini (YYYY-MM-DD)
    dokumen_pengajuan: null,
    nama_alat_lainnya: "",
    nama_alat: "",
    jumlah_alat: 1,
  });
  
  const [alatTangkapList, setAlatTangkapList] = useState<string[]>([]);
  
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
  
  const [anggotaList, setAnggotaList] = useState<AnggotaData[]>([]);
  const [newAnggota, setNewAnggota] = useState<AnggotaData>({
    nama_anggota: "",
    jabatan: "", // Default ke string kosong untuk placeholder
    nik: "",
    no_kusuka: ""
  });
  
  const [editFormData, setEditFormData] = useState<AnggotaData>({
    nama_anggota: "",
    jabatan: "", // Default ke string kosong untuk placeholder
    nik: "",
    no_kusuka: ""
  });
  
  useEffect(() => {
    let baseList: string[] = [];
    if (formData.wilayah_penangkapan === "perairan_umum_daratan") {
      baseList = perairan_umum_daratan;
    } else if (formData.wilayah_penangkapan === "laut") {
      baseList = laut;
    }

    const newAlatTangkapList = baseList.length > 0 ? [...baseList, "Lainnya"] : [];
    setAlatTangkapList(newAlatTangkapList);

    setFormData(prev => ({
      ...prev,
      nama_alat: baseList.length > 0 ? baseList[0] : "",
      nama_alat_lainnya: ""
    }));
  }, [formData.wilayah_penangkapan]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === "jumlah_alat") {
      setFormData({ ...formData, [name]: parseInt(value) || 1 });
    } else if (name === "nama_alat") {
      setFormData(prevFormData => ({
        ...prevFormData,
        [name]: value,
        nama_alat_lainnya: value !== "Lainnya" ? "" : prevFormData.nama_alat_lainnya
      }));
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  
  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData({ ...formData, dokumen_pengajuan: file });
  };
  
  const handleNewAnggotaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewAnggota({ ...newAnggota, [e.target.name]: e.target.value });
  };
  
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };
  
  const addAnggota = () => {
    if (!newAnggota.nama_anggota || !newAnggota.nik || !newAnggota.no_kusuka) {
      alert("Nama anggota, NIK, dan nomor KUSUKA wajib diisi!");
      return;
    }
    if (!newAnggota.jabatan) {
      alert("Jabatan anggota harus dipilih!");
      return;
    }
    
    if (newAnggota.jabatan === "ketua" && 
        anggotaList.some(anggota => anggota.jabatan === "ketua")) {
      alert("Ketua kelompok sudah ada!");
      return;
    }
    
    setAnggotaList([...anggotaList, { ...newAnggota }]);
    
    setNewAnggota({
      nama_anggota: "",
      jabatan: "", // Reset ke string kosong
      nik: "",
      no_kusuka: ""
    });
  };
  
  const removeAnggota = (index: number) => {
    const updatedAnggotaList = [...anggotaList];
    updatedAnggotaList.splice(index, 1);
    setAnggotaList(updatedAnggotaList);
    if (editingIndex === index) {
        cancelEdit();
    }
  };
  
  const handleEditAnggota = (index: number) => {
    setEditingIndex(index);
    setEditFormData({...anggotaList[index]});
  };
  
  const saveEditAnggota = () => {
    if (editingIndex !== null) {
      if (!editFormData.nama_anggota || !editFormData.nik || !editFormData.no_kusuka) {
        alert("Nama anggota, NIK, dan nomor KUSUKA wajib diisi!");
        return;
      }
      if (!editFormData.jabatan) {
        alert("Jabatan anggota harus dipilih!");
        return;
      }
      
      if (editFormData.jabatan === "ketua") {
        const otherKetua = anggotaList.findIndex((anggota, idx) => 
          idx !== editingIndex && anggota.jabatan === "ketua"
        );
        
        if (otherKetua !== -1) {
          alert("Ketua kelompok sudah ada!");
          return;
        }
      }
      
      const updatedAnggotaList = [...anggotaList];
      updatedAnggotaList[editingIndex] = editFormData;
      
      setAnggotaList(updatedAnggotaList);
      
      setEditingIndex(null);
      setEditFormData({
        nama_anggota: "",
        jabatan: "", // Reset ke string kosong
        nik: "",
        no_kusuka: ""
      });
    }
  };
  
  const cancelEdit = () => {
    setEditingIndex(null);
    setEditFormData({
      nama_anggota: "",
      jabatan: "", // Reset ke string kosong
      nik: "",
      no_kusuka: ""
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);
    setSuccessMessage(null);

    console.log("Form submission started.");
    if (!formData.nama_kub || !formData.alamat_kub || !formData.kabupaten_kota || !formData.wilayah_penangkapan || !formData.tanggal_pengajuan) {
      const msg = "Nama KUB, Alamat KUB, Kabupaten/Kota, Wilayah Penangkapan, dan Tanggal Pengajuan wajib diisi!";
      alert(msg);
      setFormError(msg);
      setIsLoading(false);
      return;
    }

    if (usulanItems.length === 0) {
      alert("Minimal harus ada satu usulan alat tangkap!");
      setFormError("Minimal harus ada satu usulan alat tangkap!");
      setIsLoading(false);
      return;
    }

    if (anggotaList.length === 0) {
      alert("Minimal harus ada satu anggota kelompok!");
      setFormError("Minimal harus ada satu anggota kelompok!");
      setIsLoading(false);
      return;
    }
    
    if (!formData.dokumen_pengajuan) {
      alert("Dokumen wajib diunggah!");
      setFormError("Dokumen pengajuan wajib diunggah!");
      setIsLoading(false);
      return;
    }

    console.log("Fetching user...");
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      const msg = "Anda harus login terlebih dahulu untuk membuat pengajuan.";
      console.error("Auth error:", authError?.message || "User not found.");
      alert(msg);
      setFormError(msg);
      setIsLoading(false);
      return;
    }
    const userId = userData.user.id;
    console.log("User ID:", userId);
    
    try {
      console.log("Inserting kelompok data:", { nama_kub: formData.nama_kub, alamat_kub: formData.alamat_kub, kabupaten_kota: formData.kabupaten_kota });
      const { data: kelompokResult, error: kelompokError } = await supabase
        .from("kelompok")
        .insert([{ nama_kub: formData.nama_kub, alamat_kub: formData.alamat_kub, kabupaten_kota: formData.kabupaten_kota }])
        .select("id_kelompok") 
        .single(); 
      
      if (kelompokError) {
        console.error("Kelompok insert error:", kelompokError);
        throw kelompokError;
      }
      if (!kelompokResult || !kelompokResult.id_kelompok) {
        const msg = "Gagal mendapatkan ID Kelompok setelah insert.";
        console.error(msg, "KelompokResult:", kelompokResult);
        throw new Error(msg);
      }
      const kelompokId = kelompokResult.id_kelompok;
      console.log("Kelompok ID:", kelompokId);
      
      const anggotaData = anggotaList.map(anggota => ({
        kelompok_id: kelompokId,
        nama_anggota: anggota.nama_anggota,
        jabatan: anggota.jabatan,
        nik: anggota.nik,
        no_kusuka: anggota.no_kusuka
      }));
      console.log("Inserting anggota data:", anggotaData);
      const { error: anggotaError } = await supabase
        .from("anggota_kelompok")
        .insert(anggotaData);
        
      if (anggotaError) {
        console.error("Anggota insert error:", anggotaError);
        throw anggotaError;
      }
      console.log("Anggota data inserted successfully.");
      
      if (!formData.dokumen_pengajuan) {
        const msg = "Dokumen pengajuan tidak ditemukan (seharusnya sudah divalidasi).";
        console.error(msg);
        throw new Error(msg);
      }
      // Sanitize the original filename
      const originalFileName = formData.dokumen_pengajuan.name;
      const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\s+/g, '_');

      const filePath = `kelompok_${kelompokId}/dokumen_pengajuan/${Date.now()}_${sanitizedFileName}`;
      console.log("Uploading document to:", filePath);
      const { data: fileData, error: fileError } = await supabase.storage
        .from("uploads")
        .upload(filePath, formData.dokumen_pengajuan);
        
      if (fileError) {
        console.error("File upload error:", fileError);
        throw fileError;
      }
      if (!fileData || !fileData.path) {
        const msg = "Gagal mendapatkan path dokumen setelah upload.";
        console.error(msg, "FileData:", fileData);
        throw new Error(msg);
      }
      console.log("Document uploaded successfully, path:", fileData.path);
      
      const pengajuanInsertData = {
        kelompok_id: kelompokId,
        user_id: userId,
        dokumen_pengajuan: fileData.path,
        wilayah_penangkapan: formData.wilayah_penangkapan,
        tanggal_pengajuan: formData.tanggal_pengajuan, // Sertakan tanggal pengajuan manual
        status_verifikasi: "Menunggu", // Status awal
      };
      console.log("Inserting pengajuan data:", pengajuanInsertData);
      const { data: pengajuanResult, error: pengajuanError } = await supabase
        .from("pengajuan")
        .insert([pengajuanInsertData])
        .select("id_pengajuan")
        .single();
        
      if (pengajuanError) {
        console.error("Pengajuan insert error:", pengajuanError);
        throw pengajuanError;
      }
      if (!pengajuanResult || !pengajuanResult.id_pengajuan) {
        const msg = "Gagal mendapatkan ID Pengajuan setelah insert.";
        console.error(msg, "PengajuanResult:", pengajuanResult);
        throw new Error(msg);
      }
      const pengajuanId = pengajuanResult.id_pengajuan;
      console.log("Pengajuan ID:", pengajuanId);
      
      // Prepare the data for inserting into detail_usulan
      const detailUsulanToInsert = usulanItems.map(item => ({
        pengajuan_id: pengajuanId,
        nama_alat: item.nama_alat,
        jumlah_alat: item.jumlah_alat,
      }));
      console.log("Inserting detail_usulan data:", detailUsulanToInsert);

      // Perform the insertion for detail_usulan
      const { error: usulanError } = await supabase
        .from("detail_usulan")
        .insert(detailUsulanToInsert);
      
      if (usulanError) {
        console.error("Detail usulan insert error:", usulanError);
        throw usulanError;
      }
      console.log("Detail usulan inserted successfully.");

      alert("Pengajuan berhasil dibuat!");
      setSuccessMessage("Pengajuan berhasil dibuat! Anda akan diarahkan ke halaman status pengajuan.");
      router.push("/pages/user/pengajuan/status"); 
    } catch (error: any) {
      console.error("Error submitting form (full error object):", error);
      const errorMessage = error.message || "Terjadi kesalahan yang tidak diketahui.";
      alert(`Gagal menyimpan pengajuan: ${errorMessage}`);
      setFormError(`Gagal menyimpan pengajuan: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      console.log("Form submission finished.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-cyan-50 to-teal-50 dark:from-slate-900 dark:via-sky-900 dark:to-teal-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        {/* Header - Adjusted for left alignment and smaller size */}
        <div className="mb-8 md:mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
            Form Pengajuan Bantuan
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Alert Messages */}
          {formError && (
            <div className="p-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg dark:bg-red-900/30 dark:text-red-300 dark:border-red-700">
              {formError}
            </div>
          )}
          {successMessage && (
            <div className="p-4 text-sm text-emerald-700 bg-emerald-100 border border-emerald-300 rounded-lg dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700">
              {successMessage}
            </div>
          )}

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column */}
            <div className="space-y-6">
              
              {/* Informasi KUB */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center mb-4">
                  <div className="w-2 h-6 bg-gradient-to-b from-sky-500 to-cyan-400 rounded-full mr-3"></div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Informasi KUB</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Nama KUB
                    </label>
                    <input
                      type="text"
                      name="nama_kub"
                      value={formData.nama_kub}
                      onChange={handleInputChange}
                      placeholder="Contoh: KUB Nelayan Sejahtera"
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Alamat KUB
                    </label>
                    <textarea
                      name="alamat_kub"
                      value={formData.alamat_kub}
                      onChange={handleInputChange}
                      placeholder="Contoh: Jl. Bahari No. 10, Desa Pesisir"
                      rows={3}
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all resize-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Kabupaten/Kota
                    </label>
                    <input
                      type="text"
                      name="kabupaten_kota"
                      value={formData.kabupaten_kota}
                      onChange={handleInputChange}
                      placeholder="Contoh: Kab. Banyuasin"
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Tanggal Pengajuan
                    </label>
                    <input
                      type="date"
                      name="tanggal_pengajuan"
                      value={formData.tanggal_pengajuan}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all"
                      required
                    />
                  </div>

                  <div className="p-3 bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 rounded-lg">
                    <p className="text-sm text-sky-700 dark:text-sky-300">
                      Penting: Pilih wilayah penangkapan untuk menampilkan opsi alat tangkap yang sesuai.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                      Wilayah Penangkapan
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center p-3 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                        <input // Radio button styling
                          type="radio"
                          name="wilayah_penangkapan"
                          value="perairan_umum_daratan"
                          checked={formData.wilayah_penangkapan === 'perairan_umum_daratan'}
                          onChange={handleRadioChange}
                          className="text-blue-600 focus:ring-blue-500"
                          required
                        />
                        <span className="ml-3 text-sm text-slate-700 dark:text-slate-300">Perairan Umum Daratan</span>
                      </label>
                      <label className="flex items-center p-3 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                        <input // Radio button styling
                          type="radio"
                          name="wilayah_penangkapan"
                          value="laut"
                          checked={formData.wilayah_penangkapan === 'laut'}
                          onChange={handleRadioChange}
                          className="text-blue-600 focus:ring-blue-500"
                          required
                        />
                        <span className="ml-3 text-sm text-slate-700 dark:text-slate-300">Laut</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Usulan Alat Tangkap */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center mb-4">
                  <div className="w-2 h-6 bg-gradient-to-b from-teal-500 to-emerald-400 rounded-full mr-3"></div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Usulan Alat Tangkap</h2>
                </div>
                
                {formData.wilayah_penangkapan ? (
                  <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Nama Alat
                          </label>
                          <select
                            name="nama_alat"
                            value={formData.nama_alat}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                          >
                            <option value="">Pilih Alat Tangkap</option>
                            {alatTangkapList.map((alat, i) => (
                              <option key={i} value={alat}>{alat}</option>
                            ))}
                          </select>
                          {formData.nama_alat === "Lainnya" && (
                            <input
                              type="text"
                              name="nama_alat_lainnya"
                              value={formData.nama_alat_lainnya}
                              onChange={handleInputChange}
                              placeholder="Nama alat tangkap lainnya"
                              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 mt-2"
                              required
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Jumlah
                          </label>
                          <input
                            type="number"
                            name="jumlah_alat"
                            value={formData.jumlah_alat}
                            onChange={handleInputChange}
                            min="1"
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        {editingUsulanIndex !== null && (
                          <button
                            type="button"
                            onClick={handleCancelEditUsulan}
                            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors rounded-md"
                          >
                            Batal
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={addUsulanItem}
                          className="px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium rounded-lg hover:from-teal-600 hover:to-emerald-600 transition-all shadow-sm hover:shadow-md"
                        >
                          {editingUsulanIndex !== null ? 'Update' : 'Tambah'}
                        </button>
                      </div>
                    </div>

                    {usulanItems.length > 0 && (
                      <div className="space-y-2">
                        {usulanItems.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-lg">
                            <div>
                              <span className="font-medium text-slate-800 dark:text-slate-200">{item.nama_alat}</span>
                              <span className="text-slate-500 dark:text-slate-400 ml-2">({item.jumlah_alat} unit)</span>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => handleEditUsulanItem(index)}
                                className="text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300 text-sm"
                                disabled={editingUsulanIndex === index}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => removeUsulanItem(index)}
                                className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 text-sm"
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                        ))}
                        
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 rounded-lg">
                    <p className="text-sm text-sky-700 dark:text-sky-300">
                      Pilih wilayah penangkapan terlebih dahulu untuk menampilkan opsi alat tangkap.
                    </p>
                  </div>
                )}
              </div> {/* Closing Usulan Alat Tangkap */}
            </div> {/* Closing Left Column */}

            {/* Right Column */}
            <div className="space-y-6">
              {/* Dokumen Pengajuan */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center mb-4">
                  <div className="w-2 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full mr-3"></div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Dokumen Pengajuan</h2>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Upload Dokumen (PDF)
                  </label>
                  <input
                    type="file"
                    name="dokumen_pengajuan"
                    onChange={handleFileChange}
                    className="w-full text-sm text-slate-500 dark:text-slate-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-sky-100 file:text-sky-700
                      hover:file:bg-sky-200
                      dark:file:bg-sky-700 dark:file:text-sky-200 dark:hover:file:bg-sky-600"
                    accept=".pdf"
                    required
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pastikan file PDF Anda berisi dokumen-dokumen berikut:
                    Proposal, Surat Usulan, KTP, Kartu KUSUKA, Surat Keterangan Tidak Mampu (SKTM),
                     Foto Alat Tangkap, Foto Rumah, dan Foto Kapal,  BPJS (opsional), KIS (opsional).
                  </p>
                </div>
              </div>

              {/* Anggota Kelompok */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center mb-4">
                  <div className="w-2 h-6 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full mr-3"></div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Anggota Kelompok</h2>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4 mb-4 space-y-3">
                  <h3 className="text-md font-medium text-slate-700 dark:text-slate-300 mb-2">Tambah Anggota Baru</h3>
                  <input type="text" name="nama_anggota" value={newAnggota.nama_anggota} onChange={handleNewAnggotaChange} placeholder="Nama Lengkap Anggota" className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all" />
                  <select name="jabatan" value={newAnggota.jabatan} onChange={handleNewAnggotaChange} className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all">
                    <option value="" disabled>Pilih Jabatan...</option>
                    <option value="anggota">Anggota</option>
                    <option value="ketua">Ketua</option>
                    <option value="sekretaris">Sekretaris</option>
                    <option value="bendahara">Bendahara</option>
                  </select>
                  
                  <input type="text" name="nik" value={newAnggota.nik} onChange={handleNewAnggotaChange} placeholder="Nomor Induk Kependudukan (NIK)" className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all" />
                  <input type="text" name="no_kusuka" value={newAnggota.no_kusuka} onChange={handleNewAnggotaChange} placeholder="Nomor Kartu KUSUKA" className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all" />
                  <div className="flex justify-end">
                    <button type="button" onClick={addAnggota} className="px-6 py-2 bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-medium rounded-lg hover:from-sky-600 hover:to-cyan-600 transition-all shadow-sm hover:shadow-md">Tambah Anggota</button>
                  </div>
                </div>

                {anggotaList.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <h3 className="text-md font-medium text-slate-700 dark:text-slate-300 mb-2">Daftar Anggota</h3>
                    {anggotaList.map((anggota, index) => (
                      <div key={index} className="p-4 bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm">
                        {editingIndex === index ? (
                          <div className="space-y-3">
                            <input type="text" name="nama_anggota" value={editFormData.nama_anggota} onChange={handleEditFormChange} placeholder="Nama Anggota" className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all" />
                            <select name="jabatan" value={editFormData.jabatan} onChange={handleEditFormChange} className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all" required>
                              <option value="" disabled>Pilih Jabatan...</option>
                              <option value="anggota">Anggota</option>
                              <option value="ketua">Ketua</option>
                              <option value="sekretaris">Sekretaris</option>
                              <option value="bendahara">Bendahara</option>
                            </select>
                            <input type="text" name="nik" value={editFormData.nik} onChange={handleEditFormChange} placeholder="NIK" className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all" />
                            <input type="text" name="no_kusuka" value={editFormData.no_kusuka} onChange={handleEditFormChange} placeholder="No. KUSUKA" className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all" />
                            <div className="flex space-x-2 justify-end pt-2">
                              <button type="button" onClick={saveEditAnggota} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-sm font-medium transition-colors">Simpan</button>
                              <button type="button" onClick={cancelEdit} className="px-4 py-2 bg-slate-400 hover:bg-slate-500 text-white rounded-md text-sm font-medium transition-colors">Batal</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-100">{anggota.nama_anggota} 
                                <span className="ml-2 text-xs capitalize px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-700 dark:text-sky-200">{anggota.jabatan}</span>
                              </p> {/* Badge for jabatan */}
                              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">NIK: {anggota.nik}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-300">No. KUSUKA: {anggota.no_kusuka}</p>
                            </div>
                            <div className="flex space-x-3 mt-1 flex-shrink-0">
                              <button 
                                type="button" 
                                onClick={() => handleEditAnggota(index)} 
                                className="text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300 text-sm"
                                disabled={editingIndex === index}
                              >
                                Edit
                              </button>
                              <button 
                                type="button" 
                                onClick={() => removeAnggota(index)} 
                                className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 text-sm"
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div> {/* Closing Right Column */}
          </div> {/* Closing Main Grid Layout */}

          {/* Submit Button */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center px-8 py-4 bg-gradient-to-r from-sky-600 via-cyan-500 to-teal-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:from-sky-700 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:ring-offset-slate-800 transition-all disabled:opacity-70"
            >
              {isLoading ? "Memproses Pengajuan..." : "Kirim Pengajuan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}