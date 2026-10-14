"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, adminChangeStatus } from "@/lib/api";
import {
  NEXT_STATUSES,
  STATUS_LABEL,
  requiresComment,
  type AdminClaim,
  type ClaimStatus,
} from "@/lib/types";
import { Alert, Button, Field, StatusBadge, inputClass } from "../ui";

interface Props {
  claim: AdminClaim | null;
  apiKey: string;
  onClose: () => void;
  onUpdated: (claim: AdminClaim) => void;
  onUnauthorized: () => void;
}

/** Diálogo nativo <dialog>: trae trampa de foco, cierre con Esc y backdrop sin dependencias. */
export function StatusDialog({ claim, apiKey, onClose, onUpdated, onUnauthorized }: Props) {
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
      aria-labelledby="dialogo-titulo"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl p-0 shadow-xl backdrop:bg-slate-900/50"
    >
      {/* key: reinicia el formulario al abrir otro reclamo */}
      {claim && (
        <DialogBody
          key={claim.folio}
          claim={claim}
          apiKey={apiKey}
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
  apiKey,
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
      const updated = await adminChangeStatus(apiKey, claim.folio, {
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
    <form onSubmit={handleSubmit} noValidate className="p-6">
      <h2 id="dialogo-titulo" className="text-lg font-bold text-slate-900">
        Cambiar estado
      </h2>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span className="font-mono font-semibold text-slate-900">{claim.folio}</span>
        <span aria-hidden="true">·</span>
        <span>Estado actual:</span>
        <StatusBadge status={claim.status} />
      </p>

      {options.length === 0 ? (
        <div className="mt-5">
          <Alert tone="info">Este reclamo está en un estado final y ya no admite cambios.</Alert>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
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
                rows={4}
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

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          {options.length === 0 ? "Cerrar" : "Cancelar"}
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
