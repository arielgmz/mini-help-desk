"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { ApiError, adminListClaims, login } from "@/lib/api";
import { adminSession, parseSession, type AdminSession } from "@/lib/session";
import {
  CLAIM_STATUSES,
  STATUS_LABEL,
  type AdminClaim,
  type ClaimStatus,
  type Paged,
} from "@/lib/types";
import { Alert, Button, EmptyState, Field, Skeleton, inputClass } from "../ui";
import { ClaimsTable } from "./ClaimsTable";
import { StatusDialog } from "./StatusDialog";

const PAGE_SIZE = 10;
const REFRESH_MS = 30_000;

const noopSubscribe = () => () => {};

export function AdminApp() {
  // false en el servidor y true en el cliente: evita parpadeo del login antes de leer la sesión.
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const raw = useSyncExternalStore(adminSession.subscribe, adminSession.getRaw, () => null);
  const session = useMemo(() => parseSession(raw), [raw]);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSessionEnded = useCallback((message: string) => {
    setNotice(message);
    adminSession.clear();
  }, []);

  if (!isClient) return <Skeleton className="mx-auto h-72 max-w-md" />;

  if (!session) {
    return <LoginForm notice={notice} onLoggedIn={() => setNotice(null)} />;
  }

  return (
    <Dashboard
      session={session}
      onLogout={() => {
        setNotice(null);
        adminSession.clear();
      }}
      onSessionEnded={handleSessionEnded}
    />
  );
}

function LoginForm({ notice, onLoggedIn }: { notice: string | null; onLoggedIn: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;

    const errors: typeof fieldErrors = {};
    if (!username.trim()) errors.username = "Ingrese su usuario.";
    if (!password) errors.password = "Ingrese su contraseña.";
    setFieldErrors(errors);
    setError(null);
    if (errors.username || errors.password) return;

    inFlight.current = true;
    setSubmitting(true);
    try {
      const result = await login(username.trim(), password);
      adminSession.set({
        token: result.accessToken,
        expiresAt: result.expiresAt,
        username: result.username,
      });
      onLoggedIn();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setError("Usuario o contraseña incorrectos.");
      } else if (e instanceof ApiError && e.status === 429) {
        setError("Demasiados intentos. Espere un minuto e intente de nuevo.");
      } else if (e instanceof ApiError && Object.keys(e.fieldErrors).length > 0) {
        setFieldErrors({ username: e.fieldErrors.username, password: e.fieldErrors.password });
      } else {
        setError(e instanceof Error ? e.message : "Ocurrió un error inesperado.");
      }
      setPassword("");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        aria-busy={submitting}
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Acceso administrativo</h1>
          <p className="mt-1 text-sm text-slate-600">Inicie sesión para gestionar los reclamos.</p>
        </div>
        {notice && <Alert tone="info">{notice}</Alert>}
        {error && <Alert title="No se pudo iniciar sesión">{error}</Alert>}

        <Field id="username" label="Usuario" error={fieldErrors.username}>
          {(aria) => (
            <input
              {...aria}
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
              className={inputClass(aria["aria-invalid"])}
            />
          )}
        </Field>
        <Field id="password" label="Contraseña" error={fieldErrors.password}>
          {(aria) => (
            <input
              {...aria}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className={inputClass(aria["aria-invalid"])}
            />
          )}
        </Field>

        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? "Ingresando…" : "Iniciar sesión"}
        </Button>
        <p className="text-xs text-slate-500">
          La sesión se guarda solo en esta pestaña y expira automáticamente.
        </p>
      </form>
    </div>
  );
}

function Dashboard({
  session,
  onLogout,
  onSessionEnded,
}: {
  session: AdminSession;
  onLogout: () => void;
  onSessionEnded: (message: string) => void;
}) {
  const { token, expiresAt, username } = session;
  const [status, setStatus] = useState<ClaimStatus | "">("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<AdminClaim> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminClaim | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const requestId = useRef(0);

  const handleUnauthorized = useCallback(
    () => onSessionEnded("Su sesión expiró o no es válida. Inicie sesión nuevamente."),
    [onSessionEnded],
  );

  // Cierra la sesión justo cuando el JWT expira, sin esperar a que falle una petición.
  useEffect(() => {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    const timer = setTimeout(handleUnauthorized, Math.max(remaining, 0));
    return () => clearTimeout(timer);
  }, [expiresAt, handleUnauthorized]);

  const load = useCallback(
    // `loading` lo activan los manejadores de eventos (filtro, página, "Actualizar"); aquí solo se apaga.
    async (silent: boolean) => {
      const id = ++requestId.current;
      try {
        const result = await adminListClaims(token, { status, page, pageSize: PAGE_SIZE, overdueOnly });
        if (id !== requestId.current) return; // llegó una respuesta más reciente
        setData(result);
        setError(null);
      } catch (e) {
        if (id !== requestId.current) return;
        if (e instanceof ApiError && e.status === 401) {
          handleUnauthorized();
          return;
        }
        // En un refresco silencioso conservamos la tabla actual en vez de reemplazarla por un error.
        if (!silent) setError(e instanceof Error ? e.message : "Ocurrió un error inesperado.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [token, status, overdueOnly, page, handleUnauthorized],
  );

  useEffect(() => {
    // Sincroniza con un sistema externo (el API): el estado se asigna después del await, no de forma síncrona.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(false);
  }, [load]);

  // Actualización periódica sin recargar la página (pausada con el diálogo abierto o la pestaña oculta).
  useEffect(() => {
    if (selected) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load, selected]);

  function handleUpdated(updated: AdminClaim) {
    setSelected(null);
    setFlash(`Reclamo ${updated.folio} actualizado a "${STATUS_LABEL[updated.status]}".`);
    // Actualización inmediata de la fila; el refresco posterior concilia totales y paginación.
    setData((current) =>
      current
        ? {
            ...current,
            items: current.items
              .map((c) => (c.folio === updated.folio ? updated : c))
              .filter((c) => (!status || c.status === status) && (!overdueOnly || c.isOverdue)),
          }
        : current,
    );
    void load(true);
  }

  const items = data?.items ?? [];
  const totalPages = Math.max(data?.totalPages ?? 1, 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Reclamos</h1>
          <p className="mt-1 text-sm text-slate-600">
            {data ? `${data.totalCount} reclamo${data.totalCount === 1 ? "" : "s"}` : "Cargando…"}
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            Sesión de <strong className="font-semibold text-slate-800">{username}</strong>
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="w-full sm:w-52">
            <Field id="filtro-estado" label="Filtrar por estado">
              {() => (
                <select
                  id="filtro-estado"
                  value={status}
                  onChange={(e) => {
                    setLoading(true);
                    setStatus(e.target.value as ClaimStatus | "");
                    setPage(1);
                  }}
                  className={inputClass()}
                >
                  <option value="">Todos</option>
                  {CLAIM_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 has-[:checked]:border-rose-400 has-[:checked]:bg-rose-50 has-[:checked]:text-rose-800 sm:min-h-10">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => {
                setLoading(true);
                setOverdueOnly(e.target.checked);
                setPage(1);
              }}
              className="size-4 accent-rose-600"
            />
            Solo vencidos
          </label>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <Button
              variant="secondary"
              onClick={() => {
                setLoading(true);
                void load(false);
              }}
              disabled={loading}
            >
              Actualizar
            </Button>
            <Button variant="ghost" onClick={onLogout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>

      <div aria-live="polite">{flash && <Alert tone="info">{flash}</Alert>}</div>
      {error && <Alert title="No se pudo cargar el listado">{error}</Alert>}

      {!error && !loading && items.length === 0 ? (
        <EmptyState title="No hay reclamos para mostrar">
          {overdueOnly
            ? "No hay reclamos vencidos con estos filtros. ¡Todo al día!"
            : status
              ? "Pruebe con otro estado o quite el filtro."
              : "Aún no se han registrado reclamos."}
        </EmptyState>
      ) : (
        !error && <ClaimsTable claims={items} loading={loading} onChangeStatus={setSelected} />
      )}

      {data && data.totalPages > 1 && (
        <nav aria-label="Paginación" className="flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            disabled={page <= 1 || loading}
            onClick={() => {
              setLoading(true);
              setPage((p) => p - 1);
            }}
          >
            Anterior
          </Button>
          <span className="text-center text-sm text-slate-600">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages || loading}
            onClick={() => {
              setLoading(true);
              setPage((p) => p + 1);
            }}
          >
            Siguiente
          </Button>
        </nav>
      )}

      <StatusDialog
        claim={selected}
        token={token}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
        onUnauthorized={handleUnauthorized}
      />
    </div>
  );
}
