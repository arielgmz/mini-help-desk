import { describe, expect, it, vi } from "vitest";
import { ApiError, adminListClaims, createClaim, toApiError } from "./api";

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("toApiError", () => {
  it("toma el primer mensaje de cada campo de un ProblemDetails de validación", () => {
    const error = toApiError(422, {
      detail: "Uno o más campos no son válidos.",
      errors: { email: ["Email inválido.", "Otro"], phone: ["Teléfono inválido."] },
    });
    expect(error.status).toBe(422);
    expect(error.message).toBe("Uno o más campos no son válidos.");
    expect(error.fieldErrors).toEqual({ email: "Email inválido.", phone: "Teléfono inválido." });
  });

  it("usa un mensaje genérico si no hay ProblemDetails", () => {
    expect(toApiError(500, null).message).toBe("Ocurrió un error inesperado.");
  });
});

describe("request", () => {
  it("envía el JWT como Authorization: Bearer y el filtro de vencidos", async () => {
    const fetchMock = mockFetch(200, { items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 0 });

    await adminListClaims("mi-token", { status: "EnProceso", page: 2, pageSize: 10, overdueOnly: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/admin/claims?page=2&pageSize=10&status=EnProceso&overdue=true");
    expect(init.headers.Authorization).toBe("Bearer mi-token");
    expect(init.headers["X-Api-Key"]).toBeUndefined();
  });

  it("convierte un error HTTP en ApiError con los errores por campo", async () => {
    mockFetch(422, { detail: "Datos inválidos", errors: { fullName: ["Muy corto."] } });

    const error = await createClaim({
      fullName: "a",
      documentId: "1",
      email: "x",
      phone: null,
      claimType: "Otro",
      description: "x",
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).fieldErrors.fullName).toBe("Muy corto.");
  });

  it("traduce un fallo de red en ApiError con status 0", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const error = await adminListClaims("t", { status: "", page: 1, pageSize: 10 }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
  });
});
