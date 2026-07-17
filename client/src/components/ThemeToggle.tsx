import { useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

function getInitialTheme(): "light" | "dark" {
  const stored = localStorage.getItem("theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  const next = useMemo(() => (theme === "dark" ? "light" : "dark"), [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      onClick={() => setTheme(next)}
      data-testid="theme-toggle"
      className="
        rounded-xl
        bg-secondary/70 hover:bg-secondary
        border border-border/60
        shadow-sm
        transition-all duration-300 ease-out
        hover:-translate-y-0.5
        active:translate-y-0
      "
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
