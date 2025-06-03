import Link from "next/link";
import { ThemeSwitcher } from "../../components/theme-switcher";

export default function Footer() {
  return (
    <footer className="w-full border-t border-t-foreground/10 bg-white dark:bg-gray-900">
      <div className="container mx-auto py-4 px-4">
        <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} Perikanan Tangkap. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0">
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}