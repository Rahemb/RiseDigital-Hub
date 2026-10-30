"use client";
import { ThemeProvider, useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { themeAction } from "@/app/settings-actions";
export function ThemeSync({ theme }: { theme: string }) {
  const { setTheme } = useTheme();
  useEffect(() => setTheme(theme), [theme, setTheme]);
  return null;
}
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [error, setError] = useState("");
  return (
    <button
      aria-label="Toggle color theme"
      title={error || "Toggle color theme"}
      onClick={async () => {
        const theme = resolvedTheme === "dark" ? "light" : "dark";
        setTheme(theme);
        try {
          await themeAction(theme);
          setError("");
        } catch {
          setError("Theme changed locally; unable to save account preference");
        }
      }}
      className="icon-button"
    >
      <Sun size={18} className="hidden dark:block" />
      <Moon size={18} className="dark:hidden" />
    </button>
  );
}
