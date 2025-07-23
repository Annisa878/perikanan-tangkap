"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { 
  Menu, 
  X, 
  User, 
  ChevronDown, 
  LayoutDashboard, 
  FileBarChart, 
  Users, 
  ClipboardList, 
  FileText, 
  PenSquare, 
  MessageSquare, 
  Briefcase,
  LogOut,
  UserCircle,
  FileSpreadsheet,
  FilePlus2,
  History, // Import History icon
  CheckSquare,
  Archive, // Import Archive icon
  FileCheck
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const supabase = createClient();

export default function Navbar() {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isPermohonanOpen, setIsPermohonanOpen] = useState(false);
  const [isLayananUtamaOpen, setIsLayananUtamaOpen] = useState(false); // Renamed from isPermohonanOpen
  const [isRiwayatOpen, setIsRiwayatOpen] = useState(false); // New state for Riwayat dropdown
  const [isPengajuanOpen, setIsPengajuanOpen] = useState(false); // New state for Pengajuan dropdown for Kepala Bidang
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const layananUtamaDropdownRef = useRef<HTMLDivElement>(null); // Renamed from permohonanDropdownRef
  const riwayatDropdownRef = useRef<HTMLDivElement>(null); // New ref for Riwayat dropdown
  const pengajuanDropdownRef = useRef<HTMLDivElement>(null); // New ref for Pengajuan dropdown

  // Handle closing dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
      if (layananUtamaDropdownRef.current && !layananUtamaDropdownRef.current.contains(event.target as Node)) {
        setIsLayananUtamaOpen(false);
      }
      if (riwayatDropdownRef.current && !riwayatDropdownRef.current.contains(event.target as Node)) {
        setIsRiwayatOpen(false);
      }
      if (pengajuanDropdownRef.current && !pengajuanDropdownRef.current.contains(event.target as Node)) {
        setIsPengajuanOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const loggedUser = data.session?.user || null;
        setUser(loggedUser);

        if (loggedUser) {
          const { data: userData, error: roleError } = await supabase
            .from("users")
            .select("role")
            .eq("id", loggedUser.id)
            .single();

          if (roleError) throw roleError;
          setRole(userData?.role || "Admin Kab/Kota");
        }
      } catch (err: unknown) { // Type err as unknown
        let errorMessage = "An unknown error occurred while checking session.";
        // Attempt to extract a more specific message from the error object
        if (err instanceof Error) { // Check if it's a standard Error object
          errorMessage = err.message;
        } else if (typeof err === 'string') {
          errorMessage = err;
        } else if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
           // Fallback check for objects that might have a message property (e.g., Supabase errors)
           errorMessage = (err as any).message;
        }
      }
    };

    checkSession();

    const authListener = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      checkSession();
    });

    return () => {
      authListener.data?.subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/sign-in");
  };

  const navClasses = `fixed w-full transition-all duration-300 z-50 ${
    scrolled // Apply different styles based on scroll position
      ? "bg-white/90 backdrop-blur-md shadow-lg text-sky-700" // Scrolled: Light background, sky blue text
      : "bg-gradient-to-r from-sky-500 to-cyan-600 text-white" // Default: Sea gradient, white text
  }`;

  return (
    <>
      <div className="h-16"></div> {/* Spacer for fixed navbar */}
      <nav className={navClasses}>
        <div className="max-w-screen-xl mx-auto flex justify-between items-center px-4 h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white/20 backdrop-blur-sm p-1">
              <Image
                src="/logosumsel.png"
                alt="Pemprov Sumsel"
                fill
                className="object-contain p-1"
                sizes="40px"
              />
            </div>
            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white/20 backdrop-blur-sm p-1">
              <Image
                src="/logo.jpeg"
                alt="Perikanan Tangkap"
                fill
                className="object-contain p-1"
                sizes="40px"
              />
            </div>
            <Link href="/" className={`text-xl font-semibold transition-colors ${scrolled ? 'text-sky-700 dark:text-sky-300' : 'text-white'}`}> {/* Adjust text color based on scroll */}
              Perikanan Tangkap
            </Link>
          </div>

          {/* Menu Berdasarkan Role */}
          <div className="hidden md:flex space-x-1 items-center">
            {role === "Admin Provinsi" ? (
              <>{/* Reduced font size from text-sm to text-xs */}
                <NavLink href="/pages/admin" icon={<LayoutDashboard size={16} />}>Dashboard</NavLink>
                <NavLink href="/pages/admin/manage_user" icon={<Users size={16} />}>Manajemen User</NavLink>
                <NavLink href="/pages/admin/data_pengajuan" icon={<FileText size={16} />}>Data Pengajuan</NavLink> {/* Changed icon */}
                <NavLink href="/pages/admin/monitoring" icon={<FileText size={16} />}>Data Monitoring</NavLink> {/* Changed icon */}
              </> /* Reduced font size from text-sm to text-xs */
            ) : role === "Kepala Bidang" ? (
              <>
                <NavLink href="/pages/kepala-bidang" icon={<LayoutDashboard size={16} />}>Dashboard</NavLink>
                <NavLink href="/pages/kepala-bidang/verifikasi_pengajuan" icon={<FileCheck size={16} />}>Verifikasi Pengajuan</NavLink>
                <NavLink href="/pages/kepala-bidang/verifikasi_monitoring" icon={<ClipboardList size={16} />}>Verifikasi Monitoring</NavLink>
              </>
            ) : role === "Kepala Dinas" ? (
              <>
                <NavLink href="/pages/kepala-dinas" icon={<LayoutDashboard size={16} />}>Dashboard</NavLink>
                <NavLink href="/pages/kepala-dinas/laporan-pengajuan" icon={<FileSpreadsheet size={16} />}>Laporan Pengajuan</NavLink>
                <NavLink href="/pages/kepala-dinas/laporan-akhir" icon={<ClipboardList size={16} />}>Laporan Monitoring</NavLink>
                </>
            ) : (
              <>
                <NavLink href="/pages/user" icon={<LayoutDashboard size={16} />}>Dashboard</NavLink>
                
                {/* Dropdown Layanan Utama */}
                <div className="relative" ref={layananUtamaDropdownRef}>
                  <button 
                    onClick={() => {
                      setIsLayananUtamaOpen(!isLayananUtamaOpen);
                      setIsRiwayatOpen(false); // Close other dropdown
                    }}
                    className={`flex items-center px-3 py-2 text-xs font-medium rounded-full transition-all duration-300 ${
                      scrolled
                        ? "text-sky-700 hover:bg-sky-100"
                        : "text-white hover:bg-white/20"
                    }`}
                  >
                    <Briefcase size={16} className="mr-1.5" /> {/* Icon for Layanan Utama */}
                    Layanan Utama
                    <ChevronDown 
                      size={14} 
                      className={`ml-1 transition-transform duration-300 ${isLayananUtamaOpen ? "rotate-180" : ""}`} 
                    />
                  </button>
                  
                  <AnimatePresence>
                    {isLayananUtamaOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 mt-1 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50" // Adjusted width, added dark mode styles
                      >
                        <div className="py-1">
                          <DropdownLink href="/pages/user/pengajuan/baru" icon={<FilePlus2 size={16} />}>
                            Pengajuan Bantuan
                          </DropdownLink>
                          <DropdownLink href="/pages/user/laporan/" icon={<FileBarChart size={16} />}>
                            Laporan Monitoring
                          </DropdownLink>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Dropdown Riwayat */}
                <div className="relative" ref={riwayatDropdownRef}>
                  <button 
                    onClick={() => {
                      setIsRiwayatOpen(!isRiwayatOpen);
                      setIsLayananUtamaOpen(false); // Close other dropdown
                    }}
                    className={`flex items-center px-3 py-2 text-xs font-medium rounded-full transition-all duration-300 ${
                      scrolled
                        ? "text-sky-700 hover:bg-sky-100"
                        : "text-white hover:bg-white/20"
                    }`}
                  >
                    <History size={16} className="mr-1.5" /> {/* Icon for Riwayat */}
                    Riwayat
                    <ChevronDown 
                      size={14} 
                      className={`ml-1 transition-transform duration-300 ${isRiwayatOpen ? "rotate-180" : ""}`} 
                    />
                  </button>
                  
                  <AnimatePresence>
                    {isRiwayatOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50" // Added dark mode styles
                      >
                        <div className="py-1">
                          <DropdownLink href="/pages/user/pengajuan/status" icon={<Archive size={16} />}>
                            Riwayat Pengajuan
                          </DropdownLink>
                          <DropdownLink href="/pages/user/laporan/daftar" icon={<FileText size={16} />}>
                            Riwayat Monitoring
                          </DropdownLink>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>

          {/* Profil User */}
          <div className="hidden md:block relative" ref={userDropdownRef}>
            {user ? (
              <>
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className={`flex items-center space-x-2 rounded-full pr-4 pl-3 py-2 transition-all duration-300 ${
                    scrolled
                      ? "bg-sky-100 hover:bg-sky-200 text-sky-700" // Scrolled user button
                      : "bg-white/10 hover:bg-white/20 text-white" // Default user button
                  }`}
                >
                  <div className="bg-sky-500 rounded-full p-1"> {/* Icon background for user avatar */}
                    <User size={16} className="text-white" />
                  </div>
                  <span className="text-sm font-medium max-w-[150px] truncate">
                    {user?.email}
                  </span>
                  <ChevronDown size={16} className={`transition-transform duration-300 ${isUserDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isUserDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50" // Added dark mode styles
                    >
                      <div className="py-2">
                        <Link 
                          href="/profile" 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-sky-50 transition-colors"
                        >
                          <UserCircle size={16} className="mr-2 text-sky-600" />
                          Profil
                        </Link>
                        <button 
                          onClick={handleLogout} 
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut size={16} className="mr-2" />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <Link
                href="/sign-in"
                className={`flex items-center space-x-2 rounded-full px-5 py-2 transition-all duration-300 ${
                  scrolled
                    ? "bg-sky-600 hover:bg-sky-700 text-white" // Scrolled login button
                    : "bg-white/10 hover:bg-white/20 text-white" // Default login button
                }`}
              >
                <User size={16} />
                <span>Login</span>
              </Link>
            )}
          </div>

          {/* Tombol Menu Mobile */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className={`md:hidden rounded-full p-2 transition-colors ${
              scrolled // Adjust icon color based on scroll
                ? "text-sky-700 hover:bg-sky-100"
                : "text-white hover:bg-white/20"
            }`}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden bg-white dark:bg-slate-800" // Added background for mobile menu container
            >
              <div className="bg-white shadow-lg rounded-b-lg mx-4 mb-4 overflow-hidden">
                {role === "Admin Provinsi" ? (
                  <>
                    <MobileNavLink href="/pages/admin" icon={<LayoutDashboard size={18} />}>Dashboard</MobileNavLink>
                    <MobileNavLink href="/pages/admin/manage_user" icon={<Users size={18} />}>Manajemen User</MobileNavLink>
                    <MobileNavLink href="/pages/admin/data_pengajuan" icon={<FileBarChart size={18} />}>Data Pengajuan</MobileNavLink>
                    <MobileNavLink href="/pages/admin/monitoring" icon={<FileBarChart size={18} />}>Monitoring Laporan</MobileNavLink>
                  </>
                ) : role === "Kepala Bidang" ? (
                  <>
                    <MobileNavLink href="/pages/kepala-bidang" icon={<LayoutDashboard size={18} />}>Dashboard</MobileNavLink>
                    <MobileNavLink href="/pages/kepala-bidang/verifikasi_pengajuan" icon={<FileCheck size={18} />}>Verifikasi Pengajuan</MobileNavLink>
                    <MobileNavLink href="/pages/kepala-bidang/verifikasi_monitoring" icon={<ClipboardList size={18} />}>Verifikasi Laporan</MobileNavLink> {/* Adjusted text */}
                  </>
                ) : role === "Kepala Dinas" ? (
                  <>
                    <MobileNavLink href="/pages/kepala-dinas" icon={<LayoutDashboard size={18} />}>Dashboard</MobileNavLink>
                    <MobileNavLink href="/pages/kepala-dinas/laporan-pengajuan" icon={<FileSpreadsheet size={18} />}>Laporan Pengajuan</MobileNavLink>
                    <MobileNavLink href="/pages/kepala-dinas/laporan-akhir" icon={<ClipboardList size={18} />}>Laporan Monitoring</MobileNavLink>
                  </>
                ) : (
                  <>
                    <MobileNavLink href="/pages/user" icon={<LayoutDashboard size={18} />}>Dashboard</MobileNavLink>
                    
                    {/* Mobile Layanan Utama Section */}
                    <div className="px-6 py-2 text-sm font-medium text-sky-700 dark:text-sky-300"> {/* Added dark mode text color */}
                      <div className="flex items-center">
                        <Briefcase size={18} className="mr-3 text-sky-600" />
                        <span>Layanan Utama</span>
                      </div>
                      <div className="ml-7 mt-1 space-y-1">
                        <Link href="/pages/user/pengajuan/baru" className="flex items-center py-2 pl-3 border-l-2 border-sky-200 text-sky-600 hover:bg-sky-50 transition-colors">
                          <FilePlus2 size={16} className="mr-2" />
                          Pengajuan Bantuan {/* Text looks fine */}
                        </Link>
                        <Link href="/pages/user/laporan/monitoring" className="flex items-center py-2 pl-3 border-l-2 border-sky-200 text-sky-600 hover:bg-sky-50 transition-colors">
                          <FileBarChart size={16} className="mr-2" /> {/* Icon looks fine */}
                          Laporan Monitoring
                        </Link>
                      </div>
                    </div>

                    {/* Mobile Riwayat Section */}
                    <div className="px-6 py-2 text-sm font-medium text-sky-700">
                      <div className="flex items-center text-sky-700 dark:text-sky-300"> {/* Added dark mode text color */}
                        <History size={18} className="mr-3 text-sky-600" />
                        <span>Riwayat</span>
                      </div>
                      <div className="ml-7 mt-1 space-y-1">
                        <Link href="/pages/user/pengajuan/status" className="flex items-center py-2 pl-3 border-l-2 border-sky-200 text-sky-600 hover:bg-sky-50 transition-colors">
                          <Archive size={16} className="mr-2" />
                          Riwayat Pengajuan
                        </Link> {/* Text looks fine */}
                        <Link href="/pages/user/laporan/daftar" className="flex items-center py-2 pl-3 border-l-2 border-sky-200 text-sky-600 hover:bg-sky-50 transition-colors">
                          <FileText size={16} className="mr-2" />
                          Daftar Laporan
                        </Link>
                      </div>
                    </div>
                  </>
                )}
                
                <div className="border-t border-gray-100 dark:border-slate-700 my-2"></div> {/* Added dark mode border */}
                
                {user ? (
                  <>
                    <MobileNavLink href="/profile" icon={<UserCircle size={18} />}>Profil</MobileNavLink>
                    <button 
                      onClick={handleLogout} 
                      className="flex items-center w-full text-left px-6 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={18} className="mr-3" />
                      Logout
                    </button>
                  </>
                ) : (
                  <MobileNavLink href="/sign-in" icon={<User size={18} />}>Login</MobileNavLink>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}

const NavLink = ({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) => {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  
  return (
    <Link 
      href={href} 
      className={`flex items-center px-3 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
        scrolled // Adjusted text size from text-sm to text-xs in NavLink
          ? "text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-800/30" // Scrolled NavLink with dark mode
          : "text-white hover:bg-white/20" // Default NavLink
      }`}
    >
      <span className="mr-1.5">{icon}</span>
      <span className="text-xs">{children}</span> {/* Reduced font size here */}
    </Link>
  );
};

const DropdownLink = ({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) => {
  return (
    <Link 
      href={href} 
      className="flex items-center px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 transition-colors"
    > {/* Text color and hover are fine */}
      <span className="mr-2 text-sky-600">{icon}</span>
      {children}
    </Link>
  );
};

const MobileNavLink = ({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) => {
  return (
    <Link 
      href={href} 
      className="flex items-center px-6 py-3 text-sm text-sky-700 hover:bg-sky-50 transition-colors"
    > {/* Text color and hover are fine */}
      <span className="mr-3 text-sky-600">{icon}</span>
      {children}
    </Link>
  );
};