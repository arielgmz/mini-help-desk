"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { TRACKING_COOKIE, TRACKING_COOKIE_MAX_AGE_SECONDS } from "@/lib/tracking";
import { validateLookup } from "@/lib/validation";
import type { LookupState } from "./lookup-state";

export async function lookupClaim(_previous: LookupState, formData: FormData): Promise<LookupState> {
  const folio = String(formData.get("folio") ?? "")
    .trim()
    .toUpperCase();
  const email = String(formData.get("email") ?? "").trim();

  const errors = validateLookup(folio, email);
  if (errors.folio || errors.email) {
    return { status: "invalid", values: { folio, email }, errors };
  }

  // El email viaja en una cookie HttpOnly (no en la URL: no queda en historial, logs ni enlaces compartidos).
  const origin = (await headers()).get("origin") ?? "";
  (await cookies()).set(TRACKING_COOKIE, JSON.stringify({ folio, email }), {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/seguimiento",
    maxAge: TRACKING_COOKIE_MAX_AGE_SECONDS,
  });

  // Fuera de cualquier try/catch: redirect() lanza una excepción de control.
  redirect(`/seguimiento?folio=${encodeURIComponent(folio)}`);
}
