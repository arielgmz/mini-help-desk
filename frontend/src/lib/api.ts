import type { AdminClaim, ClaimStatus, CreateClaimPayload, CreateClaimResponse, LoginResponse, Paged } from "./types";

/** URL pública del API (la usa el navegador; está permitida por CORS en el backend). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5017";

interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function toApiError(status: number, problem: ProblemDetails | null): ApiError {
  const fieldErrors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(problem?.errors ?? {})) {
    if (messages.length > 0) fieldErrors[field] = messages[0];
  }
  return new ApiError(status, problem?.detail ?? problem?.title ?? "Ocurrió un error inesperado.", fieldErrors);
}

async function request<T>(path: string, init: RequestInit = {}, bearerToken?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.");
  }

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as ProblemDetails | null;
    throw toApiError(response.status, problem);
  }
  return (await response.json()) as T;
}

export const createClaim = (payload: CreateClaimPayload) =>
  request<CreateClaimResponse>("/api/claims", { method: "POST", body: JSON.stringify(payload) });

/** Inicia sesión como administrador y obtiene un JWT. */
export const login = (username: string, password: string) =>
  request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export interface AdminListParams {
  status: ClaimStatus | "";
  page: number;
  pageSize: number;
  /** Solo reclamos vencidos (no finales y con fecha límite pasada). */
  overdueOnly?: boolean;
}

export const adminListClaims = (token: string, { status, page, pageSize, overdueOnly }: AdminListParams) => {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) query.set("status", status);
  if (overdueOnly) query.set("overdue", "true");
  return request<Paged<AdminClaim>>(`/api/admin/claims?${query}`, { cache: "no-store" }, token);
};

export const adminChangeStatus = (
  token: string,
  folio: string,
  body: { status: ClaimStatus; comment: string | null },
) =>
  request<AdminClaim>(
    `/api/admin/claims/${encodeURIComponent(folio)}/status`,
    { method: "PATCH", body: JSON.stringify(body) },
    token,
  );
