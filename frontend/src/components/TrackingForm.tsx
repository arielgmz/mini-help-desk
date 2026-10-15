"use client";

import { useActionState } from "react";
import { lookupClaim } from "@/app/seguimiento/actions";
import type { LookupState } from "@/app/seguimiento/lookup-state";
import { Button, Field, inputClass } from "./ui";

interface Props {
  defaultFolio: string;
  defaultEmail: string;
}

const INITIAL: LookupState = { status: "idle" };

/** Solo el formulario: el resultado lo obtiene y renderiza el Server Component de la página. */
export function TrackingForm({ defaultFolio, defaultEmail }: Props) {
  const [state, formAction, pending] = useActionState(lookupClaim, INITIAL);
  const errors = state.status === "invalid" ? state.errors : {};
  const values = state.status === "invalid" ? state.values : { folio: defaultFolio, email: defaultEmail };

  return (
    <form
      // Remonta los campos cuando la página trae otra consulta (por ejemplo, un enlace con ?folio=).
      key={`${defaultFolio}|${defaultEmail}`}
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
            defaultValue={values.folio}
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
            defaultValue={values.email}
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
  );
}
