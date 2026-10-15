"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui";

const LINKS = [
  { href: "/reclamos", label: "Registrar reclamo" },
  { href: "/seguimiento", label: "Seguimiento" },
  { href: "/admin", label: "Administración" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="flex flex-wrap gap-1">
      {LINKS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center rounded-md px-3 text-sm font-medium transition-colors",
              active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
