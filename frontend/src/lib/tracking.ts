import type { ClaimTracking } from "./types";

/**
 * Acceso a la API para el seguimiento, usado SOLO en el servidor (Server Components y Server Actions).
 * El navegador nunca llama a este endpoint ni conoce la URL interna de la API.
 */
const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5017";

/** Cookie HttpOnly con la última consulta (folio + email), para no poner el email en la URL. */
export const TRACKING_COOKIE = "pr_tracking";
export const TRACKING_COOKIE_MAX_AGE_SECONDS = 15 * 60;

export interface TrackingQuery {
  folio: string;
  email: string;
}

export type TrackingResult =
  { status: "found"; claim: ClaimTracking; overdue: boolean } | { status: "not-found" } | { status: "error" };

export function parseTrackingCookie(raw: string | undefined): TrackingQuery | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<TrackingQuery>;
    return typeof value.folio === "string" && typeof value.email === "string"
      ? { folio: value.folio, email: value.email }
      : null;
  } catch {
    return null;
  }
}

export async function fetchClaimTracking({ folio, email }: TrackingQuery): Promise<TrackingResult> {
  let response: Response;
  try {
    response = await fetch(
      `${API_URL}/api/claims/${encodeURIComponent(folio)}?email=${encodeURIComponent(email)}`,
      // Dato personal y cambiante: nunca se cachea.
      { cache: "no-store", headers: { Accept: "application/json" } },
    );
  } catch {
    return { status: "error" };
  }

  // La API responde 404 tanto para folio inexistente como para email incorrecto (anti-enumeración).
  if (response.status === 404) return { status: "not-found" };
  if (!response.ok) return { status: "error" };

  const claim = (await response.json()) as ClaimTracking;
  const isFinal = claim.status === "Resuelto" || claim.status === "Rechazado";
  return { status: "found", claim, overdue: !isFinal && new Date(claim.dueDate).getTime() < Date.now() };
}
