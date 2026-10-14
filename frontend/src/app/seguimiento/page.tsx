import type { Metadata } from "next";
import { Suspense } from "react";
import { TrackingForm } from "@/components/TrackingForm";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Seguimiento de reclamo" };

export default function TrackingPage({ searchParams }: PageProps<"/seguimiento">) {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Seguimiento de reclamo</h1>
        <p className="mt-2 text-slate-600">
          Por su seguridad, solo mostramos el reclamo si el folio y el correo coinciden con los registrados.
        </p>
      </header>
      {/* searchParams es dato de la petición: se resuelve dentro de Suspense (Cache Components). */}
      <Suspense fallback={<Skeleton className="h-36" />}>
        <TrackingSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TrackingSection({ searchParams }: Pick<PageProps<"/seguimiento">, "searchParams">) {
  const params = await searchParams;
  const folio = typeof params.folio === "string" ? params.folio.slice(0, 20).toUpperCase() : "";
  return <TrackingForm defaultFolio={folio} />;
}
