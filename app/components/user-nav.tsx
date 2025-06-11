"use client";

import { useState } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export function UserNav({ user }: { user: User }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center text-sm border-2 border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-slate-800 transition-all" // Adjusted focus ring color and added transition
      >
        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
          {user.email?.charAt(0).toUpperCase() || "U"}
        </div>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 ring-1 ring-slate-200 dark:ring-slate-700 z-10"> {/* Adjusted background, border, ring */}
          <div className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700"> {/* Adjusted text color and border */}
            <p className="font-medium">{user.email}</p>
          </div>
          
          <Link href="/setting" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors"> {/* Adjusted text color and hover */}
            setting
          </Link>
          
          <button // Consider using Button component
            onClick={handleSignOut}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}