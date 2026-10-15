import { CLAIM_TYPES, type ClaimType } from "./types";

export type ClaimFormValues = {
  fullName: string;
  documentId: string;
  email: string;
  phone: string;
  claimType: ClaimType | "";
  description: string;
};

export type ClaimFormField = keyof ClaimFormValues;
export type FieldErrors = Partial<Record<ClaimFormField, string>>;

export const DESCRIPTION_MAX = 2000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOC_RE = /^[A-Za-z0-9][A-Za-z0-9\- ]*$/;
const PHONE_RE = /^\d{7,15}$/;

/** Reglas espejo de las del backend (FluentValidation); el servidor sigue siendo la fuente de verdad. */
export function validateClaimField(field: ClaimFormField, raw: string): string | undefined {
  const value = raw.trim();
  switch (field) {
    case "fullName":
      if (!value) return "El nombre completo es obligatorio.";
      if (value.length < 3 || value.length > 100) return "Debe tener entre 3 y 100 caracteres.";
      return undefined;
    case "documentId":
      if (!value) return "El CI es obligatorio.";
      if (value.length < 4 || value.length > 20) return "El CI debe tener entre 4 y 20 caracteres.";
      if (!DOC_RE.test(value)) return "Solo letras, números, espacios y guiones.";
      return undefined;
    case "email":
      if (!value) return "El correo electrónico es obligatorio.";
      if (value.length > 254 || !EMAIL_RE.test(value)) return "Ingrese un correo electrónico válido.";
      return undefined;
    case "phone":
      if (value && !PHONE_RE.test(value)) return "Debe contener entre 7 y 15 dígitos numéricos.";
      return undefined;
    case "claimType":
      if (!value || !(CLAIM_TYPES as readonly string[]).includes(value)) return "Seleccione el tipo de reclamo.";
      return undefined;
    case "description":
      if (!value) return "La descripción es obligatoria.";
      if (value.length < 20) return `Faltan ${20 - value.length} caracteres (mínimo 20).`;
      if (value.length > DESCRIPTION_MAX) return `Máximo ${DESCRIPTION_MAX} caracteres.`;
      return undefined;
  }
}

export const CLAIM_FIELDS: ClaimFormField[] = ["fullName", "documentId", "email", "phone", "claimType", "description"];

export function validateClaimForm(values: ClaimFormValues): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of CLAIM_FIELDS) {
    const message = validateClaimField(field, values[field]);
    if (message) errors[field] = message;
  }
  return errors;
}

export const FOLIO_RE = /^REC-\d{4}-\d{6}$/i;

export function validateLookup(folio: string, email: string) {
  const errors: { folio?: string; email?: string } = {};
  if (!folio.trim()) errors.folio = "Ingrese el folio de su reclamo.";
  else if (!FOLIO_RE.test(folio.trim())) errors.folio = "El folio debe tener el formato REC-2026-000123.";
  if (!email.trim()) errors.email = "Ingrese el correo con el que registró el reclamo.";
  else if (!EMAIL_RE.test(email.trim())) errors.email = "Ingrese un correo electrónico válido.";
  return errors;
}
