"use client"; // Diperlukan untuk useState

import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image"; // Import komponen Image dari Next.js
import { useState, use } from "react"; // Import useState dan use
import { Eye, EyeOff } from "lucide-react"; // Import ikon mata

export default function Login(props: { searchParams: Promise<Message> }) { 
  // Unwrap searchParams menggunakan React.use(). Ini akan menangguhkan jika promise belum selesai.
  const resolvedSearchParams = use(props.searchParams);
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div
      className="h-screen w-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-slate-900 dark:to-cyan-950"
    >
      <form
        action={signInAction}
        className="bg-white dark:bg-slate-800/50 dark:backdrop-blur-sm p-8 rounded-xl shadow-lg w-full max-w-md transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/20"
      >
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.jpeg" // Pastikan logo.jpeg ada di folder /public
            alt="Logo Perusahaan"
            width={80} // Sesuaikan lebar logo
            height={80} // Sesuaikan tinggi logo
            className="rounded-full shadow-md"
          />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-600 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
            Selamat Datang
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6">
            Masuk untuk melanjutkan ke dashboard Anda.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
              Email
            </Label>
            <Input
              name="email"
              placeholder="you@example.com"
              required
              className="mt-1 border-slate-300 focus:border-sky-500 focus:ring-sky-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
          <div>
            <div className="flex justify-between items-center">
              <Label
                htmlFor="password"
                className="text-slate-700 dark:text-slate-300"
              >
                Password
              </Label>
              <Link
                className="text-xs text-cyan-600 hover:text-teal-600 underline"
                href="/forgot-password"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative mt-1">
              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                required
                className="border-slate-300 focus:border-sky-500 focus:ring-sky-500 pr-10 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <SubmitButton
            pendingText="Signing In..."
            className="w-full bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-400 hover:from-sky-600 hover:via-cyan-500 hover:to-teal-500 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 mt-2"
          >
            Sign in
          </SubmitButton>
          <FormMessage message={resolvedSearchParams} />
        </div>
      </form>
    </div>
  );
}
