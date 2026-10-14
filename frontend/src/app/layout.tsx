import type { Metadata } from "next";
import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Punto de Reclamo",
    template: "%s · Punto de Reclamo",
  },
  description: "Registre y dé seguimiento a sus reclamos de forma simple y segura.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
        >
          Saltar al contenido
        </a>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-base font-bold text-slate-900">
              <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-sm text-white" aria-hidden="true">
                PR
              </span>
              Punto de Reclamo
            </Link>
            <NavLinks />
          </div>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white">
          <p className="mx-auto max-w-5xl px-4 py-4 text-xs text-slate-500">
            Su reclamo será atendido en un plazo máximo de 5 días hábiles desde su registro.
          </p>
        </footer>
      </body>
    </html>
  );
}
