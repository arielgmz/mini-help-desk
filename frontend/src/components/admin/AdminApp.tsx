"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { ApiError, adminListClaims } from "@/lib/api";
import { adminSession } from "@/lib/session";
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
  const apiKey = useSyncExternalStore(adminSession.subscribe, adminSession.get, () => null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isClient) return <Skeleton className="mx-auto h-64 max-w-md" />;

  if (!apiKey) {
    return <LoginForm notice={notice} onLoggedIn={() => setNotice(null)} />;
  }

  return (
    <Dashboard
      apiKey={apiKey}
      onLogout={() => adminSession.clear()}
      onUnauthorized={() => {
        setNotice("Su sesión no es válida. Ingrese la clave nuevamente.");
        adminSession.clear();
      }}
    />
  );
}

function LoginForm({ notice, onLoggedIn }: { notice: string | null; onLoggedIn: () => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (checking) return;
    const value = key.trim();
    if (!value) {
      setError("Ingrese la clave de administración.");
      return;
    }

    setChecking(true);
    setError(null);
    try {
      // Valida la clave contra un endpoint protegido antes de guardarla.
      await adminListClaims(value, { status: "", page: 1, pageSize: 1 });
      adminSession.set(value);
      onLoggedIn();
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? "La clave de administración no es válida."
          : e instanceof Error
            ? e.message
            : "Ocurrió un error inesperado.",
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Acceso administrativo</h1>
          <p className="mt-1 text-sm text-slate-600">Ingrese la clave de API para gestionar los reclamos.</p>
        </div>
        {notice && <Alert tone="info">{notice}</Alert>}
        <Field id="apikey" label="Clave de administración (X-Api-Key)" error={error ?? undefined}>
          {(aria) => (
            <input
              {...aria}
              id="apikey"
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={checking}
              className={inputClass(aria["aria-invalid"])}
            />
          )}
        </Field>
        <Button type="submit" loading={checking} className="w-full">
          {checking ? "Verificando…" : "Ingresar"}
        </Button>
        <p className="text-xs text-slate-500">La clave se guarda solo en esta pestaña y se descarta al cerrarla.</p>
      </form>
    </div>
  );
}

function Dashboard({
  apiKey,
  onLogout,
  onUnauthorized,
}: {
  apiKey: string;
  onLogout: () => void;
  onUnauthorized: () => void;
}) {
  const [status, setStatus] = useState<ClaimStatus | "">("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<AdminClaim> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminClaim | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(
    // `loading` lo activan los manejadores de eventos (filtro, página, "Actualizar"); aquí solo se apaga.
    async (silent: boolean) => {
      const id = ++requestId.current;
      try {
        const result = await adminListClaims(apiKey, { status, page, pageSize: PAGE_SIZE });
        if (id !== requestId.current) return; // llegó una respuesta más reciente
        setData(result);
        setError(null);
      } catch (e) {
        if (id !== requestId.current) return;
        if (e instanceof ApiError && e.status === 401) {
          onUnauthorized();
          return;
        }
        // En un refresco silencioso conservamos la tabla actual en vez de reemplazarla por un error.
        if (!silent) setError(e instanceof Error ? e.message : "Ocurrió un error inesperado.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [apiKey, status, page, onUnauthorized],
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
              .filter((c) => !status || c.status === status),
          }
        : current,
    );
    void load(true);
  }

  const items = data?.items ?? [];
  const totalPages = Math.max(data?.totalPages ?? 1, 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Reclamos</h1>
          <p className="mt-1 text-sm text-slate-600">
            {data ? `${data.totalCount} reclamo${data.totalCount === 1 ? "" : "s"}` : "Cargando…"}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-48">
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

      <div aria-live="polite">{flash && <Alert tone="info">{flash}</Alert>}</div>
      {error && <Alert title="No se pudo cargar el listado">{error}</Alert>}

      {!error && !loading && items.length === 0 ? (
        <EmptyState title="No hay reclamos para mostrar">
          {status ? "Pruebe con otro estado o quite el filtro." : "Aún no se han registrado reclamos."}
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
          <span className="text-sm text-slate-600">
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
        apiKey={apiKey}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
        onUnauthorized={onUnauthorized}
      />
    </div>
  );
}
