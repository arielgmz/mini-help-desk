import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AdminClaim } from "@/lib/types";
import { ClaimsTable } from "./ClaimsTable";

export const adminClaim = (overrides: Partial<AdminClaim> = {}): AdminClaim => ({
  folio: "REC-2026-000001",
  fullName: "Ana Pérez Rojas",
  documentId: "4587123",
  email: "ana.perez@example.com",
  phone: null,
  claimType: "Cobros",
  description: "Se me cobró una comisión de mantenimiento que no corresponde.",
  status: "Recibido",
  createdAt: "2026-10-01T10:00:00Z",
  dueDate: "2026-10-08T10:00:00Z",
  resolvedAt: null,
  isOverdue: false,
  ...overrides,
});

describe("ClaimsTable", () => {
  it("muestra folio, tipo, cliente, estado y fecha límite, con badge en los vencidos", () => {
    render(
      <ClaimsTable
        loading={false}
        onSelect={() => {}}
        claims={[
          adminClaim({ folio: "REC-2026-000002", isOverdue: true }),
          adminClaim({ folio: "REC-2026-000003", status: "Resuelto", isOverdue: false }),
        ]}
      />,
    );

    const table = screen.getByRole("table");
    const [, overdueRow, closedRow] = within(table).getAllByRole("row");
    expect(within(overdueRow).getByText("REC-2026-000002")).toBeInTheDocument();
    expect(within(overdueRow).getByText("Cobros")).toBeInTheDocument();
    expect(within(overdueRow).getByText("Ana Pérez Rojas")).toBeInTheDocument();
    expect(within(overdueRow).getByText("Recibido")).toBeInTheDocument();
    expect(within(overdueRow).getByText("Vencido")).toBeInTheDocument();
    expect(within(closedRow).queryByText("Vencido")).not.toBeInTheDocument();
  });

  it("abre el detalle del reclamo seleccionado", async () => {
    const onSelect = vi.fn();
    const claim = adminClaim({ folio: "REC-2026-000009" });
    render(<ClaimsTable loading={false} onSelect={onSelect} claims={[claim]} />);

    const table = screen.getByRole("table");
    await userEvent.click(within(table).getByRole("button", { name: "Ver detalle del reclamo REC-2026-000009" }));

    expect(onSelect).toHaveBeenCalledWith(claim);
  });

  it("muestra un skeleton mientras carga", () => {
    render(<ClaimsTable loading onSelect={() => {}} claims={[]} />);
    expect(screen.getByRole("status", { name: "Cargando reclamos" })).toBeInTheDocument();
  });
});
