import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  // **1️⃣ Ambil user dari session**
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Jika tidak login, redirect ke sign-in
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // **2️⃣ Ambil role dari session (bukan database)**
  const { data: { session } } = await supabase.auth.getSession();
  const role = session?.user?.app_metadata?.role; // Pastikan role disimpan di app_metadata

  if (!role) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // **3️⃣ Redirect berdasarkan role**
  const path = request.nextUrl.pathname;

  if (role === "user" && path.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/user", request.url));
  }

  if (role === "admin" && path.startsWith("/user")) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  
  if (role === "kepala bidang" && path.startsWith("/user")) {
    return NextResponse.redirect(new URL("/kepala-bidang", request.url));
  }
 
  if (role === "kepala dinas" && path.startsWith("/user")) {
    return NextResponse.redirect(new URL("/kepala-dinas", request.url));
  }

  return res;
}

// **4️⃣ Proteksi Halaman dengan Matcher**
export const config = {
  matcher: ["/admin/:path*", "/user/:path*"],
};
