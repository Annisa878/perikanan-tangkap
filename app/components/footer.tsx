import Link from "next/link";
import { ThemeSwitcher } from "../../components/theme-switcher";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (<footer className="w-full bg-gradient-to-r from-sky-500 to-cyan-600 text-white">
    <div className="container mx-auto flex flex-col md:flex-row justify-between items-center py-4 px-4">
      <p className="text-xs">© {currentYear} Perikanan Tangkap. All rights reserved.</p>
      <div className="mt-4 md:mt-0"><ThemeSwitcher /></div>
    </div>
  </footer>);
}