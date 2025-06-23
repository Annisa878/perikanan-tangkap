"use client"; // Tambahkan ini karena kita akan menggunakan useState

import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image"; // Import komponen Image
import { useState, use } from "react"; // Import use
import { DOMISILI_LIST } from "@/app/lib/enums"; // Import the list of values
import { Eye, EyeOff } from "lucide-react"; // Import ikon mata

export default function Signup(props: { searchParams: Promise<Message> }) { 
  const resolvedSearchParams = use(props.searchParams);
  const [showPassword, setShowPassword] = useState(false);


  return (
    <div
      className="h-screen w-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-900 dark:to-cyan-950"
    >
      <div className="bg-white p-3 rounded-xl shadow-2xl max-w-sm w-full transform transition-all hover:scale-105">
        <div className="flex justify-center mb-2"> {/* mb-3 diubah menjadi mb-2 */}
          <Image
            src="/logo.jpeg" // Pastikan path logo benar dan ada di folder /public
            alt="Logo Perusahaan"
            width={60} // Ukuran logo dikurangi
            height={60} // Ukuran logo dikurangi
            className="rounded-full" // Opsional, samakan dengan sign-in
          />
        </div>
        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-sky-600 via-cyan-500 to-teal-500 bg-clip-text text-transparent mb-1"> {/* mb-2 diubah menjadi mb-1 */}
          Buat Akun Baru
        </h1>
        <p className="text-sm text-slate-600 text-center mt-1 mb-2"> {/* mb-3 diubah menjadi mb-2 */}
          Already have an account? {" "}
          <Link className="text-cyan-600 hover:text-teal-600 font-medium underline" href="/sign-in">
            Sign in
          </Link>
        </p>
        <form action={signUpAction} className="space-y-1"> {/* space-y-2 diubah menjadi space-y-1 */}
          <div>
            <Label htmlFor="email" className="text-xs text-slate-700">Email</Label> {/* text-sm menjadi text-xs */}
            <Input name="email" placeholder="you@example.com" required className="mt-1 text-xs border-slate-300 focus:border-sky-500 focus:ring-sky-500" /> {/* text-sm menjadi text-xs */}
          </div>
          <div>
            <Label htmlFor="username" className="text-xs text-slate-700">Username</Label> {/* text-sm menjadi text-xs */}
            <Input name="username" placeholder="Username Anda" required className="mt-1 text-xs border-slate-300 focus:border-sky-500 focus:ring-sky-500" /> {/* text-sm menjadi text-xs */}
          </div>
          <div>
            <Label htmlFor="domisili" className="text-slate-700">Domisili</Label>
            <Select name="domisili" required>
              <SelectTrigger className="mt-1 w-full border-slate-300 focus:border-sky-500 focus:ring-sky-500 text-slate-700">
                <SelectValue placeholder="Pilih domisili Anda" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-300 text-slate-700">
                {DOMISILI_LIST.map((domisili: string) => (
                  <SelectItem key={domisili} value={domisili} className="hover:bg-sky-50">
                    {domisili}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs"> {/* text-sm menjadi text-xs */}
            <Label htmlFor="password" className="text-slate-700">
              Password
            </Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="•••••••• (minimal 6 karakter)"
                minLength={6}
                required
                className="border-slate-300 focus:border-sky-500 focus:ring-sky-500 pr-10" // Tambahkan padding kanan untuk ikon
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-slate-500 hover:text-sky-600">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <SubmitButton 
            pendingText="Mendaftar..." 
            className="w-full text-xs bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-400 hover:from-sky-600 hover:via-cyan-500 hover:to-teal-500 text-white font-semibold py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
          >
            Sign up
          </SubmitButton>
          <FormMessage message={resolvedSearchParams} />
        </form>
      </div>
    </div>
  );
}