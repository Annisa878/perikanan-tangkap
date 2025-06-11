"use client";

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  // Return a placeholder or null to avoid hydration mismatch during SSR
  if (!mounted) {
    return (
      <Button variant="ghost" size={"sm"} disabled className="opacity-50">
        <div className="w-4 h-4 bg-muted-foreground/20 rounded-full animate-pulse" />
      </Button>
    );
  }

  const ICON_SIZE = 16;

  const toggleTheme = () => {
    // If current resolved theme is dark, switch to light. Otherwise, switch to dark.
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Button
      variant="ghost"
      size={"sm"}
      onClick={toggleTheme}
      aria-label={resolvedTheme === 'dark' ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
    >
      {resolvedTheme === 'dark' ? (
        <Sun size={ICON_SIZE} className="text-muted-foreground" />
      ) : (
        <Moon size={ICON_SIZE} className="text-muted-foreground" />
      )}
    </Button>
  );
};

export { ThemeSwitcher };
