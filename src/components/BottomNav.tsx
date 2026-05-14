"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

const navLinks = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    ),
  },
  {
    href: "/aktiviteter",
    label: "Aktiviteter",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
        <path
          fillRule="evenodd"
          d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    href: "/wellness",
    label: "Wellness",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
        <path
          fillRule="evenodd"
          d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 surface-card border-t z-50">
      <div
        className="flex items-stretch justify-around max-w-7xl mx-auto"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {navLinks.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-4 text-xs flex-1 transition-opacity ${
                active ? "text-foreground" : "text-muted"
              }`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          );
        })}

        <div className="relative flex-1" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex flex-col items-center justify-center gap-1 py-2 px-4 text-xs text-muted w-full h-full"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
            <span>Mer</span>
          </button>

          {menuOpen && (
            <div className="absolute bottom-full right-0 mb-2 surface-card border rounded-xl shadow-lg p-2 w-52 flex flex-col gap-1">
              <button
                onClick={() => {
                  toggleTheme();
                  setMenuOpen(false);
                }}
                className="text-left px-3 py-2 text-sm rounded-lg hover:opacity-70"
              >
                {theme === "light" ? "Bytt til mørkt tema" : "Bytt til lyst tema"}
              </button>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("trenings:refresh"));
                  setMenuOpen(false);
                }}
                className="text-left px-3 py-2 text-sm rounded-lg hover:opacity-70"
              >
                Oppdater data
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}