"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, adminChangeStatus } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  NEXT_STATUSES,
  STATUS_LABEL,
  TYPE_LABEL,
  requiresComment,
  type AdminClaim,
  type ClaimStatus,
} from "@/lib/types";
import { Alert, Button, Field, OverdueBadge, StatusBadge, inputClass } from "../ui";

interface Props {
  claim: AdminClaim | null;
  token: string;
  onClose: () => void;
  onUpdated: (claim: AdminClaim) => void;
  onUnauthorized: () => void;
}

/**
 * Detalle del reclamo + acción de cambio de estado, en un <dialog> nativo
 * (trampa de foco, cierre con Esc y backdrop sin dependencias).
 */
export function ClaimDetailDialog({ claim, token, onClose, onUpdated, onUnauthorized }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (claim && !dialog.open) dialog.showModal();
    if (!claim && dialog.open) dialog.close();
  }, [claim]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="detalle-titulo"
      // `open:flex`: un `flex` incondicional anularía el display:none del <dialog> cerrado.
      className="m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden rounded-2xl p-0 shadow-xl backdrop:bg-slate-900/50 open:flex"
    >
      {/* key: reinicia el formulario al abrir otro reclamo */}
      {claim && (
        <DialogBody
          key={claim.folio}
          claim={claim}
          token={token}
          onClose={onClose}
          onUpdated={onUpdated}
          onUnauthorized={onUnauthorized}
        />
      )}
    </dialog>
  );
}

function DialogBody({
  claim,
  token,
  onClose,
  onUpdated,
  onUnauthorized,
}: Omit<Props, "claim"> & { claim: AdminClaim }) {
  const options = NEXT_STATUSES[claim.status];
  const [target, setTarget] = useState<ClaimStatus | "">(options[0] ?? "");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | undefined>();
  const inFlight = useRef(false);

  const commentRequired = target !== "" && requiresComment(target);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current || target === "") return;

    if (commentRequired && !comment.trim()) {
      setCommentError(`El comentario es obligatorio al pasar a "${STATUS_LABEL[target]}".`);
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    setCommentError(undefined);
    try {
      const updated = await adminChangeStatus(token, claim.folio, {
        status: target,
        comment: comment.trim() || null,
      });
      onUpdated(updated);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        onUnauthorized();
      } else if (e instanceof ApiError && e.fieldErrors.comment) {
        setCommentError(e.fieldErrors.comment);
      } else {
        setError(e instanceof Error ? e.message : "Ocurrió un error inesperado.");
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      {/* El contenido hace scroll; los botones quedan siempre visibles (pantallas bajas / apaisado). */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        <h2 id="detalle-titulo" className="text-lg font-bold text-slate-900">
          Detalle del reclamo
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mono font-semibold text-slate-900">{claim.folio}</span>
          <StatusBadge status={claim.status} />
          {claim.isOverdue && <OverdueBadge />}
        </p>

        <ClaimFacts claim={claim} />

        <section aria-labelledby="cambio-estado-titulo" className="mt-6 border-t border-slate-200 pt-5">
          <h3 id="cambio-estado-titulo" className="text-base font-semibold text-slate-900">
            Cambiar estado
          </h3>
          {options.length === 0 ? (
            <div className="mt-3">
              <Alert tone="info">Este reclamo está en un estado final y ya no admite cambios.</Alert>
            </div>
          ) : (
            <div className="mt-3 space-y-4">
              {error && <Alert title="No se pudo actualizar el reclamo">{error}</Alert>}

              <Field id="nuevo-estado" label="Nuevo estado">
                {(aria) => (
                  <select
                    {...aria}
                    id="nuevo-estado"
                    value={target}
                    onChange={(e) => {
                      setTarget(e.target.value as ClaimStatus);
                      setCommentError(undefined);
                    }}
                    disabled={submitting}
                    className={inputClass()}
                  >
                    {options.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABEL[status]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <Field
                id="comentario"
                label="Comentario"
                optional={!commentRequired}
                error={commentError}
                hint={commentRequired ? "Obligatorio: el cliente lo verá en su historial." : undefined}
              >
                {(aria) => (
                  <textarea
                    {...aria}
                    id="comentario"
                    rows={3}
                    maxLength={1000}
                    value={comment}
                    onChange={(e) => {
                      setComment(e.target.value);
                      setCommentError(undefined);
                    }}
                    disabled={submitting}
                    className={inputClass(aria["aria-invalid"])}
                  />
                )}
              </Field>
            </div>
          )}
        </section>
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 min-[420px]:flex-row min-[420px]:justify-end sm:px-6">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cerrar
        </Button>
        {options.length > 0 && (
          <Button type="submit" loading={submitting}>
            {submitting ? "Guardando…" : "Guardar cambio"}
          </Button>
        )}
      </div>
    </form>
  );
}

/** Datos del reclamo en solo lectura. */
function ClaimFacts({ claim }: { claim: AdminClaim }) {
  return (
    <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
      <Fact label="Cliente" value={claim.fullName} />
      <Fact label="Cédula de identidad (CI)" value={claim.documentId} />
      <Fact label="Correo electrónico" value={claim.email} breakAll />
      <Fact label="Teléfono" value={claim.phone ?? "No informado"} />
      <Fact label="Tipo de reclamo" value={TYPE_LABEL[claim.claimType]} />
      <Fact label="Registrado" value={formatDateTime(claim.createdAt)} />
      <Fact label="Fecha límite de atención" value={formatDateTime(claim.dueDate)} />
      {claim.resolvedAt && (
        <Fact
          label={claim.status === "Resuelto" ? "Resuelto el" : "Cerrado el"}
          value={formatDateTime(claim.resolvedAt)}
        />
      )}
      <div className="sm:col-span-2">
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción</dt>
        <dd className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm text-slate-800 ring-1 ring-slate-200">
          {claim.description}
        </dd>
      </div>
    </dl>
  );
}

function Fact({ label, value, breakAll }: { label: string; value: string; breakAll?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-1 text-sm font-medium text-slate-900 ${breakAll ? "break-all" : "break-words"}`}>{value}</dd>
    </div>
  );
}
