"use client";

import { useEffect, useState } from "react";

// Dark by default, like the other sites; this turns the sheet over to light.
// ⌘⇧D (Ctrl+Shift+D elsewhere) does the same from anywhere on the page.
export function ThemeSwitch() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function toggle() {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem("heckled_theme", next);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="group grid size-7 place-items-center rounded-full border border-line-strong text-muted transition-colors hover:border-ink hover:text-ink"
      aria-label={theme === "dark" ? "Switch to light (⌘⇧D)" : "Switch to dark (⌘⇧D)"}
      title="⌘⇧D"
    >
      <svg viewBox="0 0 24 24" className="size-3.5 transition-transform duration-500 group-hover:rotate-45" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        {theme === "dark" ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        )}
      </svg>
    </button>
  );
}
