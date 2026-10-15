import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, adminChangeStatus } from "@/lib/api";
import type { AdminClaim } from "@/lib/types";
import { ClaimDetailDialog } from "./ClaimDetailDialog";
import { adminClaim } from "./ClaimsTable.test";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  adminChangeStatus: vi.fn(),
}));

const changeStatusMock = vi.mocked(adminChangeStatus);

function renderDialog(claim: AdminClaim, overrides: Partial<Parameters<typeof ClaimDetailDialog>[0]> = {}) {
  const props = {
    claim,
    token: "jwt-de-prueba",
    onClose: vi.fn(),
    onUpdated: vi.fn(),
    onUnauthorized: vi.fn(),
    ...overrides,
  };
  render(<ClaimDetailDialog {...props} />);
  return props;
}

describe("ClaimDetailDialog", () => {
  beforeEach(() => {
    changeStatusMock.mockReset();
  });

  it("muestra el detalle completo del reclamo", () => {
    renderDialog(adminClaim({ phone: "71234567", isOverdue: true }));

    expect(screen.getByRole("heading", { name: "Detalle del reclamo" })).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez Rojas")).toBeInTheDocument();
    expect(screen.getByText("4587123")).toBeInTheDocument();
    expect(screen.getByText("ana.perez@example.com")).toBeInTheDocument();
    expect(screen.getByText("71234567")).toBeInTheDocument();
    expect(screen.getByText(/comisión de mantenimiento/)).toBeInTheDocument();
    expect(screen.getByText("Vencido")).toBeInTheDocument();
  });

  it("ofrece solo transiciones válidas y exige comentario al rechazar", async () => {
    const user = userEvent.setup();
    renderDialog(adminClaim({ status: "Recibido" }));

    const options = Array.from((screen.getByLabelText("Nuevo estado") as HTMLSelectElement).options).map(
      (o) => o.value,
    );
    expect(options).toEqual(["EnProceso", "Rechazado"]);

    await user.selectOptions(screen.getByLabelText("Nuevo estado"), "Rechazado");
    await user.click(screen.getByRole("button", { name: "Guardar cambio" }));

    expect(screen.getByText('El comentario es obligatorio al pasar a "Rechazado".')).toBeInTheDocument();
    expect(changeStatusMock).not.toHaveBeenCalled();
  });

  it("envía el cambio con el token y notifica el reclamo actualizado", async () => {
    const updated = adminClaim({ status: "EnProceso" });
    changeStatusMock.mockResolvedValue(updated);
    const user = userEvent.setup();
    const props = renderDialog(adminClaim({ status: "Recibido" }));

    await user.type(screen.getByLabelText(/Comentario/), "Derivado al área de cobros.");
    await user.click(screen.getByRole("button", { name: "Guardar cambio" }));

    expect(changeStatusMock).toHaveBeenCalledWith("jwt-de-prueba", "REC-2026-000001", {
      status: "EnProceso",
      comment: "Derivado al área de cobros.",
    });
    expect(props.onUpdated).toHaveBeenCalledWith(updated);
  });

  it("muestra el conflicto (409) de la API y cierra sesión ante un 401", async () => {
    const user = userEvent.setup();
    changeStatusMock.mockRejectedValueOnce(
      new ApiError(409, "No se puede cambiar el estado del reclamo de 'Recibido' a 'EnProceso'."),
    );
    const props = renderDialog(adminClaim({ status: "Recibido" }));

    await user.click(screen.getByRole("button", { name: "Guardar cambio" }));
    expect(await screen.findByText(/No se puede cambiar el estado/)).toBeInTheDocument();

    changeStatusMock.mockRejectedValueOnce(new ApiError(401, "No autorizado"));
    await user.click(screen.getByRole("button", { name: "Guardar cambio" }));
    expect(props.onUnauthorized).toHaveBeenCalled();
  });

  it("en un estado final no ofrece cambios", () => {
    renderDialog(adminClaim({ status: "Resuelto", resolvedAt: "2026-10-05T10:00:00Z" }));

    expect(screen.getByText("Este reclamo está en un estado final y ya no admite cambios.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar cambio" })).not.toBeInTheDocument();
    expect(screen.getByText("Resuelto el")).toBeInTheDocument();
  });
});
