"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/app/components/navbar";
import Footer from "@/app/components/footer";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isHidden = 
    pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");

  return (
    <>
      {!isHidden && <Navbar />}
      {children}
      {!isHidden && <Footer />}
    </>
  );
}
