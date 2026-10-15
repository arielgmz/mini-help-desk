import { formatDate, formatDateTime } from "@/lib/format";
import { STATUS_LABEL, TYPE_LABEL, type ClaimStatus, type ClaimTracking, type HistoryItem } from "@/lib/types";
import { Skeleton, StatusBadge, cn } from "./ui";

// Componentes de presentación sin estado: se renderizan en el servidor (página /seguimiento).

export function ClaimSummary({ claim, overdue }: { claim: ClaimTracking; overdue: boolean }) {
  return (
    <section
      aria-labelledby="resumen-titulo"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Folio</p>
          <h2 id="resumen-titulo" className="font-mono text-2xl font-bold tracking-wider text-slate-900">
            {claim.folio}
          </h2>
        </div>
        <StatusBadge status={claim.status} />
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        <Item label="Tipo de reclamo" value={TYPE_LABEL[claim.claimType]} />
        <Item label="Registrado" value={formatDateTime(claim.createdAt)} />
        {claim.resolvedAt ? (
          <Item
            label={claim.status === "Resuelto" ? "Resuelto el" : "Cerrado el"}
            value={formatDateTime(claim.resolvedAt)}
          />
        ) : (
          <Item
            label="Fecha límite de atención"
            value={formatDate(claim.dueDate)}
            tone={overdue ? "warn" : undefined}
          />
        )}
      </dl>

      {overdue && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Su reclamo superó el plazo estimado de atención. Estamos priorizando su caso.
        </p>
      )}

      <div className="mt-5 border-t border-slate-200 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{claim.description}</p>
      </div>
    </section>
  );
}

function Item({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={cn("mt-1 text-sm font-semibold", tone === "warn" ? "text-amber-700" : "text-slate-900")}>
        {value}
      </dd>
    </div>
  );
}

const dotStyles: Record<ClaimStatus, string> = {
  Recibido: "bg-sky-500",
  EnProceso: "bg-amber-500",
  Resuelto: "bg-emerald-500",
  Rechazado: "bg-slate-600",
};

export function Timeline({ history }: { history: HistoryItem[] }) {
  if (history.length === 0) {
    return <p className="text-sm text-slate-600">Aún no hay movimientos registrados.</p>;
  }

  return (
    <section
      aria-labelledby="historial-titulo"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 id="historial-titulo" className="text-lg font-bold text-slate-900">
        Historial del reclamo
      </h2>
      <ol className="mt-5">
        {history.map((item, index) => {
          const last = index === history.length - 1;
          return (
            <li key={`${item.changedAt}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
              {!last && <span className="absolute left-[7px] top-4 h-full w-px bg-slate-200" aria-hidden="true" />}
              <span
                className={cn("relative mt-1 size-4 shrink-0 rounded-full ring-4 ring-white", dotStyles[item.toStatus])}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {item.fromStatus
                    ? `${STATUS_LABEL[item.fromStatus]} → ${STATUS_LABEL[item.toStatus]}`
                    : "Reclamo registrado"}
                </p>
                <time dateTime={item.changedAt} className="text-xs text-slate-500">
                  {formatDateTime(item.changedAt)}
                </time>
                {item.comment && (
                  <blockquote className="mt-2 whitespace-pre-wrap rounded-lg border-l-4 border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {item.comment}
                  </blockquote>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function TrackingResultSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando resultado">
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <Skeleton className="h-7 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <Skeleton className="h-16" />
      </div>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    </div>
  );
}
