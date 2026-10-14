"use client";

import { useActionState } from "react";
import { lookupClaim } from "@/app/seguimiento/actions";
import type { LookupState } from "@/app/seguimiento/lookup-state";
import { Alert, Button, EmptyState, Field, Skeleton, inputClass } from "./ui";
import { ClaimSummary, Timeline } from "./TrackingResult";

export function TrackingForm({ defaultFolio }: { defaultFolio: string }) {
  const initial: LookupState = { status: "idle", values: { folio: defaultFolio, email: "" } };
  const [state, formAction, pending] = useActionState(lookupClaim, initial);
  const errors = state.status === "invalid" ? state.errors : {};

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-start sm:p-6"
        aria-busy={pending}
      >
        <Field id="folio" label="Folio" error={errors.folio} hint="Ejemplo: REC-2026-000123">
          {(aria) => (
            <input
              {...aria}
              id="folio"
              name="folio"
              type="text"
              autoComplete="off"
              spellCheck={false}
              defaultValue={state.values.folio}
              disabled={pending}
              className={inputClass(aria["aria-invalid"]) + " font-mono uppercase"}
            />
          )}
        </Field>
        <Field id="email" label="Correo electrónico" error={errors.email}>
          {(aria) => (
            <input
              {...aria}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={state.values.email}
              disabled={pending}
              className={inputClass(aria["aria-invalid"])}
            />
          )}
        </Field>
        <div className="sm:pt-6">
          <Button type="submit" loading={pending} className="w-full sm:w-auto">
            {pending ? "Consultando…" : "Consultar"}
          </Button>
        </div>
      </form>

      <div aria-live="polite">
        {pending ? (
          <TrackingSkeleton />
        ) : state.status === "idle" || state.status === "invalid" ? (
          <EmptyState title="Consulte el estado de su reclamo">
            Ingrese su folio y el correo con el que lo registró para ver su estado e historial.
          </EmptyState>
        ) : state.status === "not-found" ? (
          <Alert tone="error" title={state.message}>
            Verifique que el folio y el correo electrónico sean los mismos que usó al registrar el reclamo.
          </Alert>
        ) : state.status === "error" ? (
          <Alert tone="error" title="No pudimos completar la consulta">
            {state.message}
          </Alert>
        ) : (
          <div className="space-y-6">
            <ClaimSummary claim={state.claim} />
            <Timeline history={state.claim.history} />
          </div>
        )}
      </div>
    </div>
  );
}

export function TrackingSkeleton() {
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
