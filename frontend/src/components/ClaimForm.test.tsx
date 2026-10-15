import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, createClaim } from "@/lib/api";
import type { CreateClaimResponse } from "@/lib/types";
import { ClaimForm } from "./ClaimForm";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  createClaim: vi.fn(),
}));

const createClaimMock = vi.mocked(createClaim);

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nombre completo"), "María Fernández Rojas");
  await user.type(screen.getByLabelText("Cédula de identidad (CI)"), "1234567 LP");
  await user.type(screen.getByLabelText("Correo electrónico"), "maria@example.com");
  await user.type(screen.getByLabelText(/Teléfono/), "71234567");
  await user.selectOptions(screen.getByLabelText("Tipo de reclamo"), "Cobros");
  await user.type(
    screen.getByLabelText("Descripción del reclamo"),
    "Se me cobró una comisión que no corresponde según mi contrato.",
  );
}

describe("ClaimForm", () => {
  // Con llaves: si el callback devolviera el mock, Vitest lo ejecutaría como función de limpieza.
  beforeEach(() => {
    createClaimMock.mockReset();
  });

  it("valida en el cliente y no llama a la API si hay errores", async () => {
    const user = userEvent.setup();
    render(<ClaimForm />);

    await user.click(screen.getByRole("button", { name: "Enviar reclamo" }));

    expect(screen.getByText("El nombre completo es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("La descripción es obligatoria.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre completo")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Nombre completo")).toHaveFocus();
    expect(createClaimMock).not.toHaveBeenCalled();
  });

  it("muestra los errores del servidor junto a cada campo", async () => {
    createClaimMock.mockRejectedValue(
      new ApiError(422, "Uno o más campos no son válidos.", { email: "El correo ya fue bloqueado (servidor)." }),
    );
    const user = userEvent.setup();
    render(<ClaimForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Enviar reclamo" }));

    const emailError = await screen.findByText("El correo ya fue bloqueado (servidor).");
    expect(emailError).toHaveAttribute("id", "email-error");
    expect(screen.getByLabelText("Correo electrónico")).toHaveAttribute("aria-describedby", "email-error");
  });

  it("evita el doble envío: deshabilita el botón mientras se procesa", async () => {
    let resolve!: (value: CreateClaimResponse) => void;
    createClaimMock.mockReturnValue(new Promise((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<ClaimForm />);

    await fillValidForm(user);
    const button = screen.getByRole("button", { name: "Enviar reclamo" });
    await user.click(button);
    await user.click(button);

    expect(createClaimMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Enviando reclamo/ })).toBeDisabled();

    resolve({
      folio: "REC-2026-000123",
      status: "Recibido",
      createdAt: "2026-10-13T14:30:00Z",
      dueDate: "2026-10-20T14:30:00Z",
    });
    expect(await screen.findByText("REC-2026-000123")).toBeInTheDocument();
  });

  it("destaca el folio y la fecha límite al registrar", async () => {
    createClaimMock.mockResolvedValue({
      folio: "REC-2026-000123",
      status: "Recibido",
      createdAt: "2026-10-13T14:30:00Z",
      dueDate: "2026-10-20T14:30:00Z",
    });
    const user = userEvent.setup();
    render(<ClaimForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Enviar reclamo" }));

    expect(await screen.findByRole("heading", { name: "¡Reclamo registrado!" })).toHaveFocus();
    expect(screen.getByText("REC-2026-000123")).toBeInTheDocument();
    expect(screen.getByText("20 de octubre de 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Consultar seguimiento" })).toHaveAttribute(
      "href",
      "/seguimiento?folio=REC-2026-000123",
    );
    expect(createClaimMock).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: "1234567 LP", phone: "71234567", claimType: "Cobros" }),
    );
  });
});
