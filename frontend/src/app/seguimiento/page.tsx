import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { TrackingForm } from "@/components/TrackingForm";
import { ClaimSummary, Timeline, TrackingResultSkeleton } from "@/components/TrackingResult";
import { Alert, EmptyState, Skeleton } from "@/components/ui";
import { TRACKING_COOKIE, fetchClaimTracking, parseTrackingCookie, type TrackingQuery } from "@/lib/tracking";
import { FOLIO_RE } from "@/lib/validation";

export const metadata: Metadata = { title: "Seguimiento de reclamo" };

/**
 * Server Component: la consulta a la API y el render del estado e historial ocurren en el servidor.
 * Ver README, sección "Uso de Next.js", para el porqué.
 */
export default function TrackingPage({ searchParams }: PageProps<"/seguimiento">) {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Seguimiento de reclamo</h1>
        <p className="mt-2 text-slate-600">
          Por su seguridad, solo mostramos el reclamo si el folio y el correo coinciden con los registrados.
        </p>
      </header>
      {/* searchParams y cookies son datos de la petición: se resuelven dentro de Suspense (Cache Components). */}
      <Suspense fallback={<Skeleton className="h-36" />}>
        <TrackingSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TrackingSection({ searchParams }: Pick<PageProps<"/seguimiento">, "searchParams">) {
  const params = await searchParams;
  const folio = typeof params.folio === "string" ? params.folio.trim().toUpperCase().slice(0, 20) : "";

  // El email solo se usa si la cookie corresponde a este mismo folio.
  const saved = parseTrackingCookie((await cookies()).get(TRACKING_COOKIE)?.value);
  const email = saved && saved.folio === folio ? saved.email : "";
  const query: TrackingQuery | null = FOLIO_RE.test(folio) && email ? { folio, email } : null;

  return (
    <div className="space-y-6">
      <TrackingForm defaultFolio={folio} defaultEmail={email} />
      {query ? (
        // key: una nueva consulta vuelve a mostrar el skeleton mientras llega la respuesta.
        <Suspense key={`${query.folio}|${query.email}`} fallback={<TrackingResultSkeleton />}>
          <TrackingResultSection query={query} />
        </Suspense>
      ) : (
        <EmptyState title="Consulte el estado de su reclamo">
          Ingrese su folio y el correo con el que lo registró para ver su estado e historial.
        </EmptyState>
      )}
    </div>
  );
}

async function TrackingResultSection({ query }: { query: TrackingQuery }) {
  const result = await fetchClaimTracking(query);

  if (result.status === "not-found") {
    return (
      <Alert tone="error" title="No se encontró el reclamo con los datos provistos">
        Verifique que el folio y el correo electrónico sean los mismos que usó al registrar el reclamo.
      </Alert>
    );
  }

  if (result.status === "error") {
    return (
      <Alert tone="error" title="No pudimos completar la consulta">
        El servicio no está disponible en este momento. Intente nuevamente en unos minutos.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <ClaimSummary claim={result.claim} overdue={result.overdue} />
      <Timeline history={result.claim.history} />
    </div>
  );
}
