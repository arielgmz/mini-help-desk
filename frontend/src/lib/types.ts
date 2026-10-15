export const CLAIM_TYPES = ["Producto", "Atencion", "Cobros", "Otro"] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const CLAIM_STATUSES = ["Recibido", "EnProceso", "Resuelto", "Rechazado"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const STATUS_LABEL: Record<ClaimStatus, string> = {
  Recibido: "Recibido",
  EnProceso: "En proceso",
  Resuelto: "Resuelto",
  Rechazado: "Rechazado",
};

export const TYPE_LABEL: Record<ClaimType, string> = {
  Producto: "Producto",
  Atencion: "Atención",
  Cobros: "Cobros",
  Otro: "Otro",
};

/** Espejo de la máquina de estados del backend, para ofrecer solo destinos válidos en la UI. */
export const NEXT_STATUSES: Record<ClaimStatus, ClaimStatus[]> = {
  Recibido: ["EnProceso", "Rechazado"],
  EnProceso: ["Resuelto", "Rechazado"],
  Resuelto: [],
  Rechazado: [],
};

export const requiresComment = (status: ClaimStatus) => status === "Resuelto" || status === "Rechazado";

export interface CreateClaimPayload {
  fullName: string;
  documentId: string;
  email: string;
  phone: string | null;
  claimType: ClaimType;
  description: string;
}

export interface CreateClaimResponse {
  folio: string;
  status: ClaimStatus;
  createdAt: string;
  dueDate: string;
}

export interface HistoryItem {
  fromStatus: ClaimStatus | null;
  toStatus: ClaimStatus;
  comment: string | null;
  changedAt: string;
}

export interface ClaimTracking {
  folio: string;
  claimType: ClaimType;
  description: string;
  status: ClaimStatus;
  createdAt: string;
  dueDate: string;
  resolvedAt: string | null;
  history: HistoryItem[];
}

export interface AdminClaim {
  folio: string;
  fullName: string;
  documentId: string;
  email: string;
  phone: string | null;
  claimType: ClaimType;
  description: string;
  status: ClaimStatus;
  createdAt: string;
  dueDate: string;
  resolvedAt: string | null;
  isOverdue: boolean;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  username: string;
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
