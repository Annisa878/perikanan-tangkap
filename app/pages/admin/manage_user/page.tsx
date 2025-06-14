"use client";

import React, { useState, useEffect } from "react"; // Added React for potential JSX needs, though not strictly required by this diff
import { createClient } from "@/utils/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Trash2, UserPlus, Ship } from "lucide-react"; // Added Ship icon
import { toast, ToastContainer } from "react-toastify";
import { DomisiliEnum } from "@/app/lib/enums"; // Import DomisiliEnum
import "react-toastify/dist/ReactToastify.css";

// Define the User type
type User = {
  id: string;
  email: string;
  username: string;
  role: string;
  domisili: string;
  created_at: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    role: "user",
    domisili: "",
    password: "", // Only used for adding new users
  });

  const supabase = createClient();

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      username: user.username,
      role: user.role,
      domisili: user.domisili,
      password: "", // Not updating password in edit mode
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const openAddDialog = () => {
    setFormData({
      email: "",
      username: "",
      role: "user",
      domisili: "",
      password: "",
    });
    setIsAddDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    const { email, username, role, domisili } = formData;

    const { error } = await supabase
      .from("users")
      .update({ email, username, role, domisili })
      .eq("id", selectedUser.id);

    if (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    } else {
      toast.success("User updated successfully");
      fetchUsers();
      setIsEditDialogOpen(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", selectedUser.id);

    if (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    } else {
      toast.success("User deleted successfully");
      fetchUsers();
      setIsDeleteDialogOpen(false);
    }
  };

  const handleAddUser = async () => {
    const { email, password, username, role, domisili } = formData;

    // First, create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          role,
          domisili,
        },
      },
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      toast.error(`Failed to create user: ${authError.message}`);
      return;
    }

    if (!authData.user) {
      toast.error("Failed to create user");
      return;
    }

    // Then, add to the users table
    const { error: dbError } = await supabase.from("users").insert([
      {
        id: authData.user.id,
        email,
        username,
        role,
        domisili,
      },
    ]);

    if (dbError) {
      console.error("Error adding user to database:", dbError);
      toast.error("User created but failed to add user data");
    } else {
      toast.success("User added successfully");
      fetchUsers();
      setIsAddDialogOpen(false);
    }
  };

  // Function to get badge color based on role
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-indigo-100 text-indigo-700 dark:bg-indigo-700 dark:text-indigo-200"; // Deep blue for admin
      case "kepala bidang":
        return "bg-teal-100 text-teal-700 dark:bg-teal-700 dark:text-teal-200"; // Teal/Sea green for Kabid
      default:
        return "bg-sky-100 text-sky-700 dark:bg-sky-700 dark:text-sky-200"; // Sky blue for user
    }
  };

  return (
    // Mengadopsi layout utama dan latar belakang dari halaman admin/page.tsx
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-900 dark:to-cyan-950 text-slate-700 dark:text-slate-200">
      <ToastContainer position="top-right" autoClose={3000} />
      {/* Header disesuaikan dengan gaya admin/page.tsx */}
      <header className="bg-white/70 dark:bg-sky-950/70 backdrop-blur-md py-4 shadow-md sticky top-0 z-40 border-b border-sky-300/70 dark:border-sky-800/70">
        <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">
          <div className="text-xl md:text-2xl font-semibold flex items-center text-sky-700 dark:text-sky-300">
            <Ship className="mr-2.5 h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            Manajemen Pengguna
          </div>
          <Button onClick={openAddDialog} className="bg-teal-500 hover:bg-teal-600 text-white shadow-md hover:shadow-lg transition-shadow">
            <UserPlus className="mr-2 h-5 w-5" /> Tambah Pengguna
          </Button>
        </div>
      </header>

      {/* Kontainer konten utama disesuaikan */}
      <main className="container mx-auto py-6 md:py-8 px-4 md:px-6 flex-1">
        {loading ? (
          <div className="text-center py-10 text-slate-700 dark:text-slate-300">Memuat data pengguna...</div>
        ) : (
          // Wadah tabel disesuaikan dengan gaya admin/page.tsx (content blocks)
          <div className="bg-blue-50 dark:bg-slate-800 shadow-lg rounded-xl overflow-hidden">
            <Table>
              <TableCaption className="py-4 text-sm text-slate-600 dark:text-slate-400">Daftar semua pengguna terdaftar</TableCaption>
              {/* TableHeader disesuaikan dengan gaya laporan-akhir/laporan-pengajuan */}
              <TableHeader className="bg-sky-100 dark:bg-sky-700/50">
                <TableRow><TableHead className="px-6 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Username</TableHead><TableHead className="px-6 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Email</TableHead><TableHead className="px-6 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Role</TableHead><TableHead className="px-6 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase ">Domisili</TableHead><TableHead className="px-6 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Tanggal Dibuat</TableHead><TableHead className="px-6 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase text-center w-[120px]">Aksi</TableHead></TableRow>
              </TableHeader>
              {/* TableBody disesuaikan dengan gaya laporan-akhir/laporan-pengajuan */}
              <TableBody className="divide-y divide-slate-200 dark:divide-slate-700">
                {users.length === 0 ? ( 
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-700 dark:text-slate-300">
                      Tidak ada pengguna ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <TableCell className="font-medium px-6 py-4 text-slate-800 dark:text-slate-100">{user.username}</TableCell><TableCell className="px-6 py-4 text-slate-600 dark:text-slate-300">{user.email}</TableCell><TableCell className="px-6 py-4 text-center"><span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>{user.role}</span></TableCell><TableCell className="px-6 py-4 text-slate-600 dark:text-slate-300">{user.domisili}</TableCell><TableCell className="px-6 py-4 text-slate-500 dark:text-slate-400">{new Date(user.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell><TableCell className="px-6 py-4 flex items-center">
                        <Button
                          variant="outline"
                          size="icon"
                          className="mr-2 border-sky-300 dark:border-sky-600 text-sky-600 hover:bg-sky-100 dark:text-sky-400 dark:hover:bg-sky-700" // Thematic button
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-rose-300 dark:border-rose-600 text-rose-500 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-700" // Thematic button
                          onClick={() => openDeleteDialog(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-sky-100 dark:border-sky-800">
          <DialogHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
            <DialogTitle className="text-sky-700 dark:text-sky-300">Edit Pengguna</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Update user information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="col-span-3 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="col-span-3 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => handleSelectChange("role", value)}
              >
                <SelectTrigger className="col-span-3 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Pilih role" className="text-slate-900 dark:text-slate-100"/>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-700">
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="kepala bidang">Kepala Bidang</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="domisili" className="text-right">
                Domisili
              </Label>
              <Select 
                value={formData.domisili} 
                onValueChange={(value) => handleSelectChange("domisili", value)}
              >
                <SelectTrigger className="col-span-3 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Pilih domisili" className="text-slate-900 dark:text-slate-100"/>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-700">
                  {DomisiliEnum.map((domisili) => (
                    <SelectItem key={domisili} value={domisili}>
                      {domisili}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              Batal
            </Button>
            <Button onClick={handleUpdateUser} className="bg-sky-600 hover:bg-sky-700 text-white">Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-sky-100 dark:border-sky-800">
          <DialogHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
            <DialogTitle className="text-rose-600 dark:text-rose-400">Hapus Pengguna</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Are you sure you want to delete {selectedUser?.username}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} className="bg-rose-500 hover:bg-rose-600 text-white">
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-sky-100 dark:border-sky-800">
          <DialogHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
            <DialogTitle className="text-sky-700 dark:text-sky-300">Tambah Pengguna Baru</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Create a new user account
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-email" className="text-right">
                Email
              </Label>
              <Input
                id="add-email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="col-span-3 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 text-slate-900 dark:text-slate-100"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-username" className="text-right">
                Username
              </Label>
              <Input
                id="add-username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="col-span-3 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 text-slate-900 dark:text-slate-100"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-password" className="text-right">
                Password
              </Label>
              <Input
                id="add-password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                className="col-span-3 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 text-slate-900 dark:text-slate-100"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-role" className="text-right">
                Role
              </Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => handleSelectChange("role", value)}
              >
                <SelectTrigger className="col-span-3 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Pilih role" className="text-slate-900 dark:text-slate-100"/>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-700">
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="kepala bidang">Kepala Bidang</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-domisili" className="text-right">
                Domisili
              </Label>
              <Select 
                value={formData.domisili} 
                onValueChange={(value) => handleSelectChange("domisili", value)}
              >
                <SelectTrigger className="col-span-3 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Pilih domisili" className="text-slate-900 dark:text-slate-100"/>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-700">
                  {DomisiliEnum.map((domisili) => (
                    <SelectItem key={domisili} value={domisili}>
                      {domisili}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              Batal
            </Button>
            <Button onClick={handleAddUser} className="bg-teal-500 hover:bg-teal-600 text-white">Tambah Pengguna</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer - Ditambahkan untuk konsistensi */}
      <footer className="py-4 text-center text-sm text-slate-500 dark:text-slate-400 border-t border-sky-200 dark:border-sky-700">
        
      </footer>
    </div>
  );
}