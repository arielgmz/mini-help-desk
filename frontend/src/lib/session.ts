const STORAGE_KEY = "pr_admin_api_key";
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

/** La clave vive solo en sessionStorage: se descarta al cerrar la pestaña. */
export const adminSession = {
  get(): string | null {
    try {
      return window.sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  },
  set(key: string) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, key);
    } catch {
      /* almacenamiento no disponible: la sesión dura solo mientras la pestaña esté montada */
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
