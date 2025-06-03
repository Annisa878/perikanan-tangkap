"use client"; // Tambahkan ini karena kita akan menggunakan useState

import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState, use } from "react"; // Import use
import { Eye, EyeOff } from "lucide-react"; // Import ikon mata

// Enum for Domisili
export const DomisiliEnum = [
  "Kab. Banyuasin",
  "Kab. Empat Lawang",
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
  "Kota Pagar Alam",
  "Kota Prabumulih",
  "Kota Lahat"
] as const;

export default function Signup(props: { searchParams: Promise<Message> }) { 
  const resolvedSearchParams = use(props.searchParams);
  const [showPassword, setShowPassword] = useState(false);


  return (
    <div 
      className="h-screen w-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/dkp.jpg')" }}
    >
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full transform transition-all hover:scale-105">
        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-sky-600 via-cyan-500 to-teal-500 bg-clip-text text-transparent mb-2">
          Buat Akun Baru
        </h1>
        <p className="text-sm text-slate-600 text-center mt-1 mb-6">
          Already have an account? {" "}
          <Link className="text-cyan-600 hover:text-teal-600 font-medium underline" href="/sign-in">
            Sign in
          </Link>
        </p>
        <form action={signUpAction} className="mt-6 space-y-5">
          <div>
            <Label htmlFor="email" className="text-slate-700">Email</Label>
            <Input name="email" placeholder="you@example.com" required className="mt-1 border-slate-300 focus:border-sky-500 focus:ring-sky-500" />
          </div>
          <div>
            <Label htmlFor="username" className="text-slate-700">Username</Label>
            <Input name="username" placeholder="Username Anda" required className="mt-1 border-slate-300 focus:border-sky-500 focus:ring-sky-500" />
          </div>
          <div>
            <Label htmlFor="domisili" className="text-slate-700">Domisili</Label>
            <Select name="domisili" required>
              <SelectTrigger className="mt-1 w-full border-slate-300 focus:border-sky-500 focus:ring-sky-500 text-slate-700">
                <SelectValue placeholder="Pilih domisili Anda" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-300 text-slate-700">
                {DomisiliEnum.map((domisili) => (
                  <SelectItem key={domisili} value={domisili} className="hover:bg-sky-50">
                    {domisili}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
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
            formAction={signUpAction} 
            className="w-full bg-gradient-to-r from-sky-600 via-cyan-500 to-teal-500 hover:from-sky-700 hover:via-cyan-600 hover:to-teal-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
          >
            Sign up
          </SubmitButton>
          <FormMessage message={resolvedSearchParams} />
        </form>
      </div>
    </div>
  );
}