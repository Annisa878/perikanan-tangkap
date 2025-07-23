"use client";

import { useState, useEffect } from "react";
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
import { Pencil, Trash2, UserPlus, Ship } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import { DOMISILI_LIST, Domisili } from "@/app/lib/enums";
import "react-toastify/dist/ReactToastify.css";

// Define the User type
type User = {
  id: string;
  email: string;
  username: string;
  role: string;
  domisili: Domisili;
  created_at: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false); // Add loading state for update
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    role: "Admin Kab/Kota",
    domisili: "" as Domisili | "",
    password: "",
  });

  const supabase = createClient();

  const fetchUsers = async () => {
    setLoading(true);
    try {
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
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
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
      domisili: user.domisili || "",
      password: "",
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
      role: "Admin Kab/Kota",
      domisili: "" as Domisili | "",
      password: "",
    });
    setIsAddDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) {
      toast.error("No user selected");
      return;
    }

    const { username, role, domisili } = formData;

    // Validation
    if (!username.trim()) {
      toast.error("Username tidak boleh kosong");
      return;
    }

    if (!role) {
      toast.error("Role harus dipilih");
      return;
    }

    // Conditional validation for domisili based on role
    if (role === "Admin Kab/Kota") {
      if (!domisili) {
        toast.error("Domisili harus diisi untuk role Admin Kab/Kota");
        return;
      }
      if (!DOMISILI_LIST.includes(domisili as Domisili)) {
        toast.error("Domisili tidak valid");
        return;
      }
    }

    setIsUpdating(true);

    // Prepare the data for update, setting domisili to null if not applicable
    const updateData = {
      username: username.trim(),
      role,
      domisili: role === "Admin Kab/Kota" ? (domisili as Domisili) : null,
    };

    try {
      const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", selectedUser.id)
        .select(); // Add select to get updated data

      if (error) {
        console.error("Error updating user:", error);
        toast.error(`Gagal memperbarui pengguna: ${error.message || "Terjadi kesalahan tidak dikenal"}`);
      } else {
        console.log("User updated successfully:", data);
        toast.success("Pengguna berhasil diperbarui");
        await fetchUsers(); // Refresh the users list
        setIsEditDialogOpen(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error("Unexpected error during update:", error);
      toast.error("Terjadi kesalahan tidak terduga saat memperbarui pengguna");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", selectedUser.id);

      if (error) {
        console.error("Error deleting user:", error);
        toast.error("Failed to delete user");
      } else {
        toast.success("User deleted successfully");
        await fetchUsers();
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error("Unexpected error during delete:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const handleAddUser = async () => {
    const { email, password, username, role, domisili } = formData;

    // Base validation
    if (!email.trim() || !password.trim() || !username.trim() || !role) {
      toast.error("Email, Password, Username, dan Role harus diisi");
      return;
    }

    // Conditional validation for domisili
    if (role === "Admin Kab/Kota") {
      if (!domisili) {
        toast.error("Domisili harus diisi untuk role Admin Kab/Kota");
        return;
      }
      if (!DOMISILI_LIST.includes(domisili as Domisili)) {
        toast.error("Domisili tidak valid");
        return;
      }
    }

    try {
      // First, create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: username.trim(),
            role,
            domisili: role === "Admin Kab/Kota" ? domisili : null,
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
          email: email.trim(),
          username: username.trim(),
          role,
          domisili: role === "Admin Kab/Kota" ? (domisili as Domisili) : null,
        },
      ]);

      if (dbError) {
        console.error("Error adding user to database:", dbError);
        toast.error("User created but failed to add user data");
      } else {
        toast.success("User added successfully");
        await fetchUsers();
        setIsAddDialogOpen(false);
      }
    } catch (error) {
      console.error("Unexpected error during user creation:", error);
      toast.error("An unexpected error occurred");
    }
  };

  // Function to get badge color based on role
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "Admin Provinsi":
        return "bg-indigo-100 text-indigo-700 dark:bg-indigo-700 dark:text-indigo-200"; // Admin Provinsi
      case "Kepala Bidang":
        return "bg-teal-100 text-teal-700 dark:bg-teal-700 dark:text-teal-200";
      case "Kepala Dinas":
        return "bg-purple-100 text-purple-700 dark:bg-purple-700 dark:text-purple-200"; // Kepala Dinas
      case "Admin Kab/Kota":
      default: // Default to Admin Kab/Kota
        return "bg-sky-100 text-sky-700 dark:bg-sky-700 dark:text-sky-200"; // Admin Kab/Kota
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-900 dark:to-cyan-950 text-slate-700 dark:text-slate-200">
      <ToastContainer position="top-right" autoClose={3000} />
      
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

      <main className="container mx-auto py-6 md:py-8 px-4 md:px-6 flex-1">
        {loading ? (
          <div className="text-center py-10 text-slate-700 dark:text-slate-300">Memuat data pengguna...</div>
        ) : (
          <div className="bg-blue-50 dark:bg-slate-800 shadow-lg rounded-xl overflow-hidden">
            <Table>
              <TableCaption className="py-4 text-sm text-slate-600 dark:text-slate-400">Daftar semua pengguna terdaftar</TableCaption>
              <TableHeader className="bg-sky-100 dark:bg-sky-700/50">
                <TableRow>
                  <TableHead className="px-6 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Username</TableHead>
                  <TableHead className="px-6 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Email</TableHead>
                  <TableHead className="px-6 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Role</TableHead>
                  <TableHead className="px-6 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Domisili</TableHead>
                  <TableHead className="px-6 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase">Tanggal Dibuat</TableHead>
                  <TableHead className="px-6 py-3 text-xs font-medium text-sky-700 dark:text-sky-200 uppercase text-center w-[120px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
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
                      <TableCell className="font-medium px-6 py-4 text-slate-800 dark:text-slate-100">{user.username}</TableCell>
                      <TableCell className="px-6 py-4 text-slate-600 dark:text-slate-300">{user.email}</TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-slate-600 dark:text-slate-300">{user.domisili}</TableCell>
                      <TableCell className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {new Date(user.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="px-6 py-4 flex items-center">
                        <Button
                          variant="outline"
                          size="icon"
                          className="mr-2 border-sky-300 dark:border-sky-600 text-sky-600 hover:bg-sky-100 dark:text-sky-400 dark:hover:bg-sky-700"
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-rose-300 dark:border-rose-600 text-rose-500 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-700"
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
              Perbarui informasi pengguna. Email tidak dapat diubah.
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
                disabled
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
                  <SelectItem value="Admin Kab/Kota">Admin Kab/Kota</SelectItem>
                  <SelectItem value="Admin Provinsi">Admin Provinsi</SelectItem>
                  <SelectItem value="Kepala Bidang">Kepala Bidang</SelectItem>
                  <SelectItem value="Kepala Dinas">Kepala Dinas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.role === "Admin Kab/Kota" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="domisili" className="text-right">
                  Domisili
                </Label>
                <Select 
                  value={formData.domisili || ''} 
                  onValueChange={(value) => handleSelectChange("domisili", value)}
                >
                  <SelectTrigger className="col-span-3 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 text-slate-900 dark:text-slate-100">
                    <SelectValue placeholder="Pilih domisili" className="text-slate-900 dark:text-slate-100"/>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-700">
                    {DOMISILI_LIST.map((domisili) => (
                      <SelectItem key={domisili} value={domisili}>
                        {domisili}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)} 
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              disabled={isUpdating}
            >
              Batal
            </Button>
            <Button 
              onClick={handleUpdateUser} 
              className="bg-sky-600 hover:bg-sky-700 text-white"
              disabled={isUpdating}
            >
              {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
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
                  <SelectItem value="Admin Kab/Kota">Admin Kab/Kota</SelectItem>
                  <SelectItem value="Admin Provinsi">Admin Provinsi</SelectItem>
                  <SelectItem value="Kepala Bidang">Kepala Bidang</SelectItem>
                  <SelectItem value="Kepala Dinas">Kepala Dinas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.role === "Admin Kab/Kota" && (
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
                    {DOMISILI_LIST.map((domisili) => (
                      <SelectItem key={domisili} value={domisili}>
                        {domisili}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              Batal
            </Button>
            <Button onClick={handleAddUser} className="bg-teal-500 hover:bg-teal-600 text-white">Tambah Pengguna</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="py-4 text-center text-sm text-slate-500 dark:text-slate-400 border-t border-sky-200 dark:border-sky-700">
        
      </footer>
    </div>
  );
}