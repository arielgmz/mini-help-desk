import { describe, expect, it } from "vitest";
import { validateClaimField, validateClaimForm, validateLookup, type ClaimFormValues } from "./validation";

const valid: ClaimFormValues = {
  fullName: "María Fernández Rojas",
  documentId: "1234567 LP",
  email: "maria@example.com",
  phone: "71234567",
  claimType: "Cobros",
  description: "Se me cobró una comisión que no corresponde según mi contrato.",
};

describe("validateClaimForm", () => {
  it("acepta el ejemplo del enunciado", () => {
    expect(validateClaimForm(valid)).toEqual({});
  });

  it("reporta todos los campos inválidos a la vez", () => {
    const errors = validateClaimForm({
      fullName: "",
      documentId: "",
      email: "no-es-email",
      phone: "12ab",
      claimType: "",
      description: "corta",
    });
    expect(Object.keys(errors).sort()).toEqual(
      ["claimType", "description", "documentId", "email", "fullName", "phone"].sort(),
    );
  });
});

describe("validateClaimField", () => {
  it.each([
    ["ab", false],
    ["abc", true],
    ["a".repeat(100), true],
    ["a".repeat(101), false],
    ["   ab   ", false], // se valida recortado
  ])("nombre %j -> válido=%s", (value, ok) => {
    expect(validateClaimField("fullName", value) === undefined).toBe(ok);
  });

  it.each([
    ["", true], // opcional
    ["123456", false],
    ["1234567", true],
    ["123456789012345", true],
    ["1234567890123456", false],
    ["7123-456", false],
  ])("teléfono %j -> válido=%s", (value, ok) => {
    expect(validateClaimField("phone", value) === undefined).toBe(ok);
  });

  it.each([
    ["a".repeat(19), false],
    ["a".repeat(20), true],
    ["a".repeat(2000), true],
    ["a".repeat(2001), false],
  ])("descripción de %i caracteres", (value, ok) => {
    expect(validateClaimField("description", value) === undefined).toBe(ok);
  });

  it("indica cuántos caracteres faltan en la descripción", () => {
    expect(validateClaimField("description", "a".repeat(15))).toBe("Faltan 5 caracteres (mínimo 20).");
  });

  it.each([
    ["Producto", true],
    ["Atencion", true],
    ["Cobros", true],
    ["Otro", true],
    ["", false],
    ["Fraude", false],
  ])("tipo %j -> válido=%s", (value, ok) => {
    expect(validateClaimField("claimType", value) === undefined).toBe(ok);
  });

  it("CI obligatorio y sin símbolos", () => {
    expect(validateClaimField("documentId", "")).toBeDefined();
    expect(validateClaimField("documentId", "12#456")).toBeDefined();
    expect(validateClaimField("documentId", "1234567-1A")).toBeUndefined();
  });
});

describe("validateLookup", () => {
  it("exige folio con formato REC-AAAA-NNNNNN y email válido", () => {
    expect(validateLookup("REC-2026-000123", "a@b.co")).toEqual({});
    expect(validateLookup("rec-2026-000123", "a@b.co")).toEqual({}); // sin distinguir mayúsculas
    expect(validateLookup("REC-26-123", "a@b.co").folio).toBeDefined();
    expect(validateLookup("", "").email).toBeDefined();
    expect(validateLookup("REC-2026-000123", "correo").email).toBeDefined();
  });
});
