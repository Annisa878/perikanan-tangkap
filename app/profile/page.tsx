"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Edit2, Save, X, Loader2, UserCircle2, Mail, Briefcase, MapPin, CalendarDays, Lock, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

const supabase = createClient();

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState({
    email: "",
    username: "",
    role: "",
    domisili: ""
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ username: "" });

  // Password change states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    async function getUser() {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        if (!session) {
          setLoading(false);
          return;
        }
        
        setUser(session.user);
        
        // Fetch user data from the users table
        const { data, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single();
          
        if (profileError) throw profileError;
        
        setUserData({
          email: session.user.email || "",
          username: data.username || "",
          role: data.role || "",
          domisili: data.domisili || ""
        });
        
        setEditForm({ username: data.username || "" });
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    getUser();
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({ username: userData.username });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from("users")
        .update({
          username: editForm.username
        })
        .eq("id", user.id);
        
      if (error) throw error;
      
      // Update local state
      setUserData(prev => ({
        ...prev,
        username: editForm.username
      }));
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", (error as any).message || error); // Log the message or the full error object
    } finally {
      setSaving(false);
    }
  };

  // Password change functions
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
    // Clear errors when user starts typing
    if (passwordError) setPasswordError("");
    if (passwordSuccess) setPasswordSuccess("");
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePasswordSubmit = async () => {
    if (!user) return;

    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError("Semua field harus diisi");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Password baru dan konfirmasi password tidak cocok");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError("Password baru minimal 6 karakter");
      return;
    }

    try {
      setPasswordSaving(true);
      setPasswordError("");

      // First, verify current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: passwordForm.currentPassword
      });

      if (signInError) {
        setPasswordError("Password lama tidak benar");
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (updateError) {
        setPasswordError("Gagal mengubah password: " + updateError.message);
        return;
      }

      // Success
      setPasswordSuccess("Password berhasil diubah");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setIsChangingPassword(false);

      // Clear success message after 3 seconds
      setTimeout(() => setPasswordSuccess(""), 3000);

    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordError("Terjadi kesalahan saat mengubah password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
    setPasswordError("");
    setPasswordSuccess("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-100 to-cyan-200 dark:from-blue-950 dark:via-cyan-900 dark:to-slate-900">
        <Loader2 className="h-10 w-10 text-sky-600 dark:text-sky-400 animate-spin" />
        <span className="ml-3 text-lg text-slate-700 dark:text-slate-300">Memuat profil...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-100 to-cyan-200 dark:from-blue-950 dark:via-cyan-900 dark:to-slate-900 p-4">
        <div className="text-center p-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-2xl rounded-xl border border-slate-200 dark:border-slate-700 max-w-md">
          <UserCircle2 className="w-16 h-16 mx-auto text-red-500 dark:text-red-400 mb-4" />
          <h2 className="text-2xl font-semibold text-red-600 dark:text-red-400 mb-3">Anda Belum Login</h2>
          <p className="mb-6 text-slate-600 dark:text-slate-400">Silakan login terlebih dahulu untuk dapat melihat dan mengelola profil Anda.</p>
          <a 
            href="/sign-in" 
            className="inline-block px-6 py-3 bg-gradient-to-r from-sky-600 to-teal-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-sky-700 hover:to-teal-600 transition-all duration-300"
          >
            Login
          </a>
        </div>
      </div>
    );
  }
  // Generate initials for fallback avatar
  const getInitials = () => {
    if (userData.username) {
      return userData.username.charAt(0).toUpperCase();
    }
    if (userData.email) {
      return userData.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-cyan-200 dark:from-blue-950 dark:via-cyan-900 dark:to-slate-900 py-8 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg shadow-xl rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/80">
          {/* Header with banner and thumbnail overlay */}
          <div className="relative h-40">
            {/* Ocean-themed background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-600 dark:from-blue-800 dark:via-cyan-700 dark:to-teal-800"></div>
            
            {/* Thumbnail overlay */}
            <div className="absolute inset-0">
              <Image 
                src="/thumbnail.jpg" 
                alt="Profile banner"
                layout="fill"
                objectFit="cover"
                className="opacity-30 dark:opacity-20" // Adjusted opacity for better blend
                priority
              />
            </div>
            
            {/* Avatar position */}
            <div className="absolute -bottom-12 left-6 md:left-8">
              <div className="rounded-full bg-white dark:bg-slate-700 p-1.5 shadow-lg border-2 border-white dark:border-slate-600">
                <div className="h-24 w-24 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-3xl font-bold text-blue-600 dark:text-blue-300">
                  {getInitials()}
                </div>
              </div>
            </div>
          </div>
          
          {/* Profile Info */}
          <div className="pt-16 pb-8 px-6 md:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-8">
              <div className="mb-4 sm:mb-0">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">{userData.username || "Pengguna"}</h1>
                <p className="text-slate-500 dark:text-slate-400">{userData.email}</p>
              </div>
              
              {!isEditing ? (
                <button 
                  onClick={handleEdit}
                  className="flex items-center px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <Edit2 size={16} className="mr-2" />
                  Edit Profil
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button 
                    onClick={handleCancel}
                    className="flex items-center px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200 font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <X size={16} className="mr-2" />
                    Batal
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-300 disabled:bg-teal-400 dark:disabled:bg-teal-700"
                  >
                    {saving ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Save size={16} className="mr-2" />
                    )}
                    Simpan
                  </button>
                </div>
              )}
            </div>
            
            {/* Success/Error Messages */}
            {passwordSuccess && (
              <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg">
                <p className="text-green-700 dark:text-green-300">{passwordSuccess}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {/* User Details Section */}
              <div className="bg-white dark:bg-slate-700/50 rounded-lg p-6 shadow-md border border-slate-200 dark:border-slate-600/70">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6 flex items-center">
                  <UserCircle2 className="mr-2 text-sky-600 dark:text-sky-400" size={20}/>
                  Informasi Pengguna
                </h2>
                
                <div className="space-y-4">
                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Username
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="username"
                        value={editForm.username}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <p className="text-slate-800 dark:text-slate-100">{userData.username || "-"}</p>
                    )}
                  </div>
                  
                  {/* Email (read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center">
                      <Mail className="mr-2 text-slate-500 dark:text-slate-400" size={16}/>
                      Email
                    </label>
                    <p className="text-slate-800 dark:text-slate-100">{userData.email}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Email tidak dapat diubah melalui halaman ini.</p>
                  </div>
                  
                  {/* Role (read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center">
                      <Briefcase className="mr-2 text-slate-500 dark:text-slate-400" size={16}/>
                      Peran
                    </label>
                    <p className="text-slate-800 dark:text-slate-100 capitalize">{userData.role || "-"}</p>
                  </div>
                </div>
              </div>
              
              {/* Additional Info Section */}
              <div className="bg-white dark:bg-slate-700/50 rounded-lg p-6 shadow-md border border-slate-200 dark:border-slate-600/70">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6 flex items-center">
                  <MapPin className="mr-2 text-teal-600 dark:text-teal-400" size={20}/>
                  Informasi Tambahan
                </h2>
                
                <div className="space-y-4">
                  {/* Domisili */}
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Domisili
                    </label>
                    <p className="text-slate-800 dark:text-slate-100">{userData.domisili || "-"}</p>
                    {isEditing && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Domisili tidak dapat diubah melalui halaman ini.</p>
                    )}
                  </div>
                  
                  {/* Created At (read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center">
                      <CalendarDays className="mr-2 text-slate-500 dark:text-slate-400" size={16}/>
                      Terdaftar Sejak
                    </label>
                    <p className="text-slate-800 dark:text-slate-100">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      }) : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Password Change Section */}
            <div className="mt-6 bg-white dark:bg-slate-700/50 rounded-lg p-6 shadow-md border border-slate-200 dark:border-slate-600/70">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center">
                  <Lock className="mr-2 text-blue-700 dark:text-blue-400" size={20}/>
                  Keamanan
                </h2>
                
                {!isChangingPassword ? (
                  <button 
                    onClick={() => setIsChangingPassword(true)}
                    className="flex items-center px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <Lock size={16} className="mr-2" />
                    Ganti Password
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button 
                      onClick={handleCancelPasswordChange}
                      className="flex items-center px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200 font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      <X size={16} className="mr-2" />
                      Batal
                    </button>
                    <button 
                      onClick={handlePasswordSubmit}
                      disabled={passwordSaving}
                      className="flex items-center px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-300 disabled:bg-blue-500 dark:disabled:bg-blue-800"
                    >
                      {passwordSaving ? (
                        <Loader2 size={16} className="mr-2 animate-spin" />
                      ) : (
                        <Save size={16} className="mr-2" />
                      )}
                      Simpan Password
                    </button>
                  </div>
                )}
              </div>
              
              {isChangingPassword ? (
                <div className="space-y-4">
                  {/* Error Message */}
                  {passwordError && (
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                      <p className="text-red-700 dark:text-red-300 text-sm">{passwordError}</p>
                    </div>
                  )}
                  
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Password Lama
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        placeholder="Masukkan password lama"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('current')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Password Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        placeholder="Masukkan password baru (min. 6 karakter)"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('new')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Konfirmasi Password Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        placeholder="Konfirmasi password baru"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-600 dark:text-slate-400">
                  <p>Klik tombol "Ganti Password" untuk mengubah password akun Anda.</p>
                  <p className="text-sm mt-2">Pastikan password baru Anda kuat dan aman.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}