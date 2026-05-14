"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/aktiviteter", label: "Aktiviteter" },
  { href: "/wellness", label: "Wellness" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-6">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`text-sm hover:opacity-80 ${
            pathname === href ? "font-semibold" : "text-muted"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
