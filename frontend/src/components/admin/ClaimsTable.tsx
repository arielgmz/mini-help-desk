import { formatCompact } from "@/lib/format";
import { NEXT_STATUSES, TYPE_LABEL, type AdminClaim } from "@/lib/types";
import { Button, OverdueBadge, Skeleton, StatusBadge, cn } from "../ui";

interface Props {
  claims: AdminClaim[];
  loading: boolean;
  onChangeStatus: (claim: AdminClaim) => void;
}

function Action({ claim, onChangeStatus }: { claim: AdminClaim; onChangeStatus: Props["onChangeStatus"] }) {
  if (NEXT_STATUSES[claim.status].length === 0) {
    return <span className="text-xs text-slate-500">Finalizado</span>;
  }
  return (
    <Button variant="secondary" className="min-h-9 px-3" onClick={() => onChangeStatus(claim)}>
      Cambiar estado
    </Button>
  );
}

export function ClaimsTable({ claims, loading, onChangeStatus }: Props) {
  if (loading) return <TableSkeleton />;

  return (
    <>
      {/* Escritorio (>= 1024 px): con 7 columnas, por debajo la acción quedaría fuera de pantalla */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <caption className="sr-only">Listado de reclamos</caption>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3">Folio</th>
              <th scope="col" className="px-4 py-3">Cliente</th>
              <th scope="col" className="px-4 py-3">Tipo</th>
              <th scope="col" className="px-4 py-3">Estado</th>
              <th scope="col" className="px-4 py-3">Registrado</th>
              <th scope="col" className="px-4 py-3">Vence</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {claims.map((c) => (
              <tr key={c.folio} className={cn(c.isOverdue && "bg-rose-50/60")}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold">{c.folio}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{c.fullName}</div>
                  <div className="text-xs text-slate-500">{c.email}</div>
                </td>
                <td className="px-4 py-3">{TYPE_LABEL[c.claimType]}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={c.status} />
                    {c.isOverdue && <OverdueBadge />}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatCompact(c.createdAt)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatCompact(c.dueDate)}</td>
                <td className="px-4 py-3 text-right">
                  <Action claim={c} onChangeStatus={onChangeStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil */}
      <ul className="space-y-3 lg:hidden">
        {claims.map((c) => (
          <li
            key={c.folio}
            className={cn(
              "rounded-xl border bg-white p-4 shadow-sm",
              c.isOverdue ? "border-rose-300" : "border-slate-200",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold">{c.folio}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={c.status} />
                {c.isOverdue && <OverdueBadge />}
              </div>
            </div>
            <p className="mt-2 font-medium text-slate-900">{c.fullName}</p>
            <p className="text-xs text-slate-500">{c.email}</p>
            <p className="mt-2 text-xs text-slate-600">
              {TYPE_LABEL[c.claimType]} · vence {formatCompact(c.dueDate)}
            </p>
            <div className="mt-3">
              <Action claim={c} onChangeStatus={onChangeStatus} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2" role="status" aria-label="Cargando reclamos">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
