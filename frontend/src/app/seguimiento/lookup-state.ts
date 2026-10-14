import type { ClaimTracking } from "@/lib/types";

export interface LookupValues {
  folio: string;
  email: string;
}

export type LookupState =
  | { status: "idle"; values: LookupValues }
  | { status: "invalid"; values: LookupValues; errors: { folio?: string; email?: string } }
  | { status: "not-found"; values: LookupValues; message: string }
  | { status: "error"; values: LookupValues; message: string }
  | { status: "found"; values: LookupValues; claim: ClaimTracking };
