import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchClaimTracking, parseTrackingCookie } from "./tracking";
import type { ClaimTracking } from "./types";

const claim = (overrides: Partial<ClaimTracking> = {}): ClaimTracking => ({
  folio: "REC-2026-000001",
  claimType: "Cobros",
  description: "Descripción de prueba suficientemente larga.",
  status: "Recibido",
  createdAt: "2026-10-01T10:00:00Z",
  dueDate: "2026-10-08T10:00:00Z",
  resolvedAt: null,
  history: [],
  ...overrides,
});

const respond = (status: number, body?: unknown) =>
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body ? JSON.stringify(body) : null, { status })));

describe("parseTrackingCookie", () => {
  it("lee folio y email de la cookie", () => {
    expect(parseTrackingCookie(JSON.stringify({ folio: "REC-2026-000001", email: "a@b.co" }))).toEqual({
      folio: "REC-2026-000001",
      email: "a@b.co",
    });
  });

  it.each([undefined, "", "{x", JSON.stringify({ folio: 1 })])("ignora valores inválidos: %j", (raw) => {
    expect(parseTrackingCookie(raw)).toBeNull();
  });
});

describe("fetchClaimTracking", () => {
  afterEach(() => vi.useRealTimers());

  it("404 de la API -> not-found (folio inexistente o email incorrecto)", async () => {
    respond(404, { title: "No encontrado" });
    expect(await fetchClaimTracking({ folio: "REC-2026-000001", email: "a@b.co" })).toEqual({ status: "not-found" });
  });

  it("5xx o fallo de red -> error", async () => {
    respond(500);
    expect((await fetchClaimTracking({ folio: "REC-2026-000001", email: "a@b.co" })).status).toBe("error");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    expect((await fetchClaimTracking({ folio: "REC-2026-000001", email: "a@b.co" })).status).toBe("error");
  });

  it("marca vencido solo si no está cerrado y la fecha límite pasó", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T00:00:00Z"));

    respond(200, claim());
    expect(await fetchClaimTracking({ folio: "REC-2026-000001", email: "a@b.co" })).toMatchObject({
      status: "found",
      overdue: true,
    });

    respond(200, claim({ status: "Resuelto", resolvedAt: "2026-10-09T10:00:00Z" }));
    expect(await fetchClaimTracking({ folio: "REC-2026-000001", email: "a@b.co" })).toMatchObject({ overdue: false });
  });

  it("codifica folio y email en la URL y no cachea", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(claim()), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchClaimTracking({ folio: "REC-2026-000001", email: "a+b@c.co" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/claims/REC-2026-000001?email=a%2Bb%40c.co");
    expect(init.cache).toBe("no-store");
  });
});
