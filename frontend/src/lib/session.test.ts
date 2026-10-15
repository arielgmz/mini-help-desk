import { afterEach, describe, expect, it, vi } from "vitest";
import { adminSession, parseSession } from "./session";

const NOW = new Date("2026-10-14T12:00:00Z");

describe("parseSession", () => {
  afterEach(() => vi.useRealTimers());

  const raw = (expiresAt: string, extra: object = {}) =>
    JSON.stringify({ token: "jwt", expiresAt, username: "admin", ...extra });

  it("devuelve la sesión si el token sigue vigente", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(parseSession(raw("2026-10-14T13:00:00Z"))).toEqual({
      token: "jwt",
      expiresAt: "2026-10-14T13:00:00Z",
      username: "admin",
    });
  });

  it("descarta una sesión expirada", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(parseSession(raw("2026-10-14T11:59:59Z"))).toBeNull();
  });

  it.each([null, "", "{no-es-json", JSON.stringify({ token: "jwt" })])("descarta valores inválidos: %j", (value) => {
    expect(parseSession(value)).toBeNull();
  });
});

describe("adminSession", () => {
  it("guarda, notifica y borra la sesión en sessionStorage", () => {
    const listener = vi.fn();
    const unsubscribe = adminSession.subscribe(listener);

    adminSession.set({ token: "t", expiresAt: "2099-01-01T00:00:00Z", username: "admin" });
    expect(JSON.parse(adminSession.getRaw()!)).toMatchObject({ token: "t", username: "admin" });

    adminSession.clear();
    expect(adminSession.getRaw()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });
});
