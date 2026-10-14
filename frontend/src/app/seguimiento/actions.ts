"use server";

import type { ClaimTracking } from "@/lib/types";
import { validateLookup } from "@/lib/validation";
import type { LookupState } from "./lookup-state";

// La consulta se resuelve en el servidor: el navegador nunca habla con el API ni ve su URL interna.
const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5017";

const NOT_FOUND_MESSAGE = "No se encontró el reclamo con los datos provistos";

export async function lookupClaim(_previous: LookupState, formData: FormData): Promise<LookupState> {
  const folio = String(formData.get("folio") ?? "").trim().toUpperCase();
  const email = String(formData.get("email") ?? "").trim();
  const values = { folio, email };

  const errors = validateLookup(folio, email);
  if (errors.folio || errors.email) {
    return { status: "invalid", values, errors };
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/claims/${encodeURIComponent(folio)}?email=${encodeURIComponent(email)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    return {
      status: "error",
      values,
      message: "No pudimos comunicarnos con el servicio. Intente nuevamente en unos minutos.",
    };
  }

  // El API responde 404 tanto para folio inexistente como para email incorrecto (anti-enumeración).
  if (response.status === 404) {
    return { status: "not-found", values, message: NOT_FOUND_MESSAGE };
  }
  if (!response.ok) {
    return {
      status: "error",
      values,
      message: "El servicio no pudo procesar su consulta. Intente nuevamente más tarde.",
    };
  }

  const claim = (await response.json()) as ClaimTracking;
  return { status: "found", values, claim };
}
