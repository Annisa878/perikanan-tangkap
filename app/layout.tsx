import { DM_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

// Metadata
export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Sistem Monitoring Pengajuan Alat & Sarana Perikanan",
  description: "Dinas Kelautan dan Perikanan Provinsi Sumatera Selatan",
};

// Font DM Sans
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dmSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="min-h-screen flex flex-col">
            <LayoutWrapper>{children}</LayoutWrapper>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
