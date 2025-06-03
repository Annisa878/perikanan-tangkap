import { forgotPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";

export default async function ForgotPassword(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  
  return (
    <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-sky-100 via-teal-50 to-cyan-100 dark:from-slate-900 dark:via-sky-950 dark:to-teal-900 p-4 overflow-hidden">
      <div className="w-full max-w-md p-8 space-y-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-2xl rounded-xl border border-slate-200 dark:border-slate-700">
        <form className="flex flex-col gap-6 text-foreground">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-sky-700 dark:text-sky-300">
              Reset Password
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Masukkan email Anda untuk menerima tautan reset password.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
              Email
            </Label>
            <Input
              name="email"
              type="email"
              placeholder="anda@contoh.com"
              required
              className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          <SubmitButton 
            formAction={forgotPasswordAction} 
            className="w-full bg-gradient-to-r from-sky-600 to-teal-500 hover:from-sky-700 hover:to-teal-600 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
          >
            Kirim Tautan Reset
          </SubmitButton>
          
          <FormMessage message={searchParams} />
        </form>
        
        <p className="text-sm text-center text-slate-600 dark:text-slate-400">
          Sudah ingat password?{" "}
          <Link 
            className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 underline" 
            href="/sign-in"
          >
            Masuk di sini
          </Link>
        </p>
        
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <SmtpMessage />
        </div>
      </div>
    </div>
  );
}