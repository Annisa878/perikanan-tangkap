"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Edit2, Save, X, Loader2, UserCircle2, Mail, Briefcase, MapPin, CalendarDays } from "lucide-react";
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
  const [editForm, setEditForm] = useState({
    username: "",
    domisili: ""
  });

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
        
        setEditForm({
          username: data.username || "",
          domisili: data.domisili || ""
        });
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
    setEditForm({
      username: userData.username,
      domisili: userData.domisili
    });
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
          username: editForm.username,
          domisili: editForm.domisili
        })
        .eq("id", user.id);
        
      if (error) throw error;
      
      // Update local state
      setUserData(prev => ({
        ...prev,
        username: editForm.username,
        domisili: editForm.domisili
      }));
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 via-teal-50 to-cyan-100 dark:from-slate-900 dark:via-sky-950 dark:to-teal-900">
        <Loader2 className="h-10 w-10 text-sky-600 dark:text-sky-400 animate-spin" />
        <span className="ml-3 text-lg text-slate-700 dark:text-slate-300">Memuat profil...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 via-teal-50 to-cyan-100 dark:from-slate-900 dark:via-sky-950 dark:to-teal-900 p-4">
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
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-teal-50 to-cyan-100 dark:from-slate-900 dark:via-sky-950 dark:to-teal-900 py-8 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg shadow-xl rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/80">
          {/* Header with banner and thumbnail overlay */}
          <div className="relative h-40">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-500 dark:from-sky-700 dark:via-cyan-600 dark:to-teal-700"></div>
            
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
                <div className="h-24 w-24 rounded-full bg-sky-100 dark:bg-sky-800 flex items-center justify-center text-3xl font-bold text-sky-600 dark:text-sky-300">
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
                    {isEditing ? (
                      <textarea
                        name="domisili"
                        value={editForm.domisili}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <p className="text-slate-800 dark:text-slate-100">{userData.domisili || "-"}</p>
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
          </div>
        </div>
      </div>
    </div>
  );
}