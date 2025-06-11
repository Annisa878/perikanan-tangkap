import Link from "next/link";
import { ThemeSwitcher } from "../../components/theme-switcher";

export default function Footer() {
  return (
    <footer className="w-full border-t border-sky-200 dark:border-sky-700 bg-blue-50 dark:bg-slate-800"> {/* Adjusted background and border */}
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center py-4 px-4">
        <p className="text-xs text-white dark:text-sky-100">
          © {new Date().getFullYear()} Perikanan Tangkap. All rights reserved.
        </p>
        <div className="mt-4 md:mt-0">
          <ThemeSwitcher />
        </div>
      </div>
    </footer>
  );
}