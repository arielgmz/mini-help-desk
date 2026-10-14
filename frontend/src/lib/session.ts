const STORAGE_KEY = "pr_admin_session";
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

export interface AdminSession {
  token: string;
  /** ISO 8601 UTC: instante en que el JWT deja de ser válido. */
  expiresAt: string;
  username: string;
}

/** Interpreta el valor guardado; devuelve null si está corrupto o ya expiró. */
export function parseSession(raw: string | null): AdminSession | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AdminSession>;
    if (!value.token || !value.expiresAt || !value.username) return null;
    if (new Date(value.expiresAt).getTime() <= Date.now()) return null;
    return value as AdminSession;
  } catch {
    return null;
  }
}

/**
 * El JWT vive solo en sessionStorage: se descarta al cerrar la pestaña.
 * `getRaw` devuelve la cadena guardada (estable entre llamadas) para `useSyncExternalStore`.
 */
export const adminSession = {
  getRaw(): string | null {
    try {
      return window.sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  },
  set(session: AdminSession) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* almacenamiento no disponible */
    }
    notify();
  },
  clear() {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
    notify();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
