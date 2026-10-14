"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { ApiError, createClaim } from "@/lib/api";
import { CLAIM_TYPES, TYPE_LABEL, type CreateClaimResponse } from "@/lib/types";
import {
  CLAIM_FIELDS,
  DESCRIPTION_MAX,
  validateClaimForm,
  type ClaimFormField,
  type ClaimFormValues,
  type FieldErrors,
} from "@/lib/validation";
import { formatDate } from "@/lib/format";
import { Alert, Button, Field, inputClass } from "./ui";

const EMPTY: ClaimFormValues = {
  fullName: "",
  documentId: "",
  email: "",
  phone: "",
  claimType: "",
  description: "",
};

export function ClaimForm() {
  const [values, setValues] = useState<ClaimFormValues>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<ClaimFormField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreateClaimResponse | null>(null);
  // La ref bloquea un segundo envío incluso antes de que React refleje `submitting`.
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const clientErrors = validateClaimForm(values);
  const errorFor = (field: ClaimFormField) =>
    serverErrors[field] ?? (touched[field] ? clientErrors[field] : undefined);

  function handleChange(field: ClaimFormField) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
      setServerErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    };
  }

  const handleBlur = (field: ClaimFormField) => () => setTouched((prev) => ({ ...prev, [field]: true }));

  // Un input deshabilitado no puede recibir foco: tras un error del servidor se enfoca cuando termina el envío.
  const pendingFocus = useRef<ClaimFormField | null>(null);

  function focusField(field: ClaimFormField) {
    formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
  }

  useEffect(() => {
    if (!submitting && pendingFocus.current) {
      focusField(pendingFocus.current);
      pendingFocus.current = null;
    }
  }, [submitting, serverErrors]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    const errors = validateClaimForm(values);
    const firstInvalid = CLAIM_FIELDS.find((f) => errors[f]);
    if (firstInvalid) {
      setTouched(Object.fromEntries(CLAIM_FIELDS.map((f) => [f, true])));
      focusField(firstInvalid);
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setGeneralError(null);
    setServerErrors({});

    try {
      const response = await createClaim({
        fullName: values.fullName.trim(),
        documentId: values.documentId.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || null,
        claimType: values.claimType as Exclude<ClaimFormValues["claimType"], "">,
        description: values.description.trim(),
      });
      setCreated(response);
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        const mapped: FieldErrors = {};
        for (const field of CLAIM_FIELDS) {
          if (error.fieldErrors[field]) mapped[field] = error.fieldErrors[field];
        }
        setServerErrors(mapped);
        const first = CLAIM_FIELDS.find((f) => mapped[f]);
        if (first) pendingFocus.current = first;
        else setGeneralError(error.message);
      } else {
        setGeneralError(error instanceof Error ? error.message : "Ocurrió un error inesperado.");
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  function reset() {
    setValues(EMPTY);
    setTouched({});
    setServerErrors({});
    setGeneralError(null);
    setCreated(null);
  }

  if (created) {
    return <ClaimCreated claim={created} onReset={reset} />;
  }

  const descriptionLength = values.description.trim().length;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
      aria-busy={submitting}
    >
      {generalError && <Alert title="No pudimos registrar su reclamo">{generalError}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="fullName" label="Nombre completo" error={errorFor("fullName")}>
          {(aria) => (
            <input
              {...aria}
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              maxLength={100}
              value={values.fullName}
              onChange={handleChange("fullName")}
              onBlur={handleBlur("fullName")}
              disabled={submitting}
              className={inputClass(aria["aria-invalid"])}
            />
          )}
        </Field>

        <Field id="documentId" label="Cédula de identidad (CI)" error={errorFor("documentId")}>
          {(aria) => (
            <input
              {...aria}
              id="documentId"
              name="documentId"
              type="text"
              autoComplete="off"
              maxLength={20}
              value={values.documentId}
              onChange={handleChange("documentId")}
              onBlur={handleBlur("documentId")}
              disabled={submitting}
              className={inputClass(aria["aria-invalid"])}
            />
          )}
        </Field>

        <Field id="email" label="Correo electrónico" error={errorFor("email")} hint="Lo necesitará para consultar el seguimiento.">
          {(aria) => (
            <input
              {...aria}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              value={values.email}
              onChange={handleChange("email")}
              onBlur={handleBlur("email")}
              disabled={submitting}
              className={inputClass(aria["aria-invalid"])}
            />
          )}
        </Field>

        <Field id="phone" label="Teléfono" optional error={errorFor("phone")} hint="Solo dígitos, entre 7 y 15.">
          {(aria) => (
            <input
              {...aria}
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={15}
              value={values.phone}
              onChange={handleChange("phone")}
              onBlur={handleBlur("phone")}
              disabled={submitting}
              className={inputClass(aria["aria-invalid"])}
            />
          )}
        </Field>
      </div>

      <Field id="claimType" label="Tipo de reclamo" error={errorFor("claimType")}>
        {(aria) => (
          <select
            {...aria}
            id="claimType"
            name="claimType"
            value={values.claimType}
            onChange={handleChange("claimType")}
            onBlur={handleBlur("claimType")}
            disabled={submitting}
            className={inputClass(aria["aria-invalid"])}
          >
            <option value="">Seleccione una opción</option>
            {CLAIM_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field id="description" label="Descripción del reclamo" error={errorFor("description")}>
        {(aria) => (
          <>
            <textarea
              {...aria}
              id="description"
              name="description"
              rows={6}
              maxLength={DESCRIPTION_MAX}
              value={values.description}
              onChange={handleChange("description")}
              onBlur={handleBlur("description")}
              disabled={submitting}
              className={inputClass(aria["aria-invalid"])}
            />
            <p className="mt-1 text-right text-xs text-slate-500" aria-live="polite">
              {descriptionLength} / {DESCRIPTION_MAX}
            </p>
          </>
        )}
      </Field>

      <div className="flex justify-end">
        <Button type="submit" loading={submitting} className="w-full sm:w-auto">
          {submitting ? "Enviando reclamo…" : "Enviar reclamo"}
        </Button>
      </div>
    </form>
  );
}

function ClaimCreated({ claim, onReset }: { claim: CreateClaimResponse; onReset: () => void }) {
  const [copied, setCopied] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Mueve el foco al encabezado para que lectores de pantalla anuncien el resultado.
  const setHeading = (node: HTMLHeadingElement | null) => {
    headingRef.current = node;
    node?.focus();
  };

  async function copy() {
    try {
      await navigator.clipboard.writeText(claim.folio);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* el usuario puede seleccionar el folio manualmente */
    }
  }

  return (
    <section
      aria-labelledby="exito-titulo"
      className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-10"
    >
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 id="exito-titulo" ref={setHeading} tabIndex={-1} className="mt-4 text-2xl font-bold text-slate-900 outline-none">
          ¡Reclamo registrado!
        </h2>
        <p className="mt-1 text-slate-600">Guarde su folio: lo necesitará, junto con su correo, para consultar el estado.</p>

        <div className="mt-6 rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Folio</p>
          <p className="mt-1 select-all font-mono text-3xl font-bold tracking-wider text-indigo-700">{claim.folio}</p>
          <Button variant="secondary" onClick={copy} className="mt-3">
            {copied ? "¡Copiado!" : "Copiar folio"}
          </Button>
        </div>

        <dl className="mt-5 grid gap-3 text-left sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha límite de atención</dt>
            <dd className="mt-1 font-semibold text-slate-900">{formatDate(claim.dueDate)}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</dt>
            <dd className="mt-1 font-semibold text-slate-900">Recibido</dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={`/seguimiento?folio=${encodeURIComponent(claim.folio)}`}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Consultar seguimiento
          </Link>
          <Button variant="secondary" onClick={onReset}>
            Registrar otro reclamo
          </Button>
        </div>
      </div>
    </section>
  );
}
