export interface LookupValues {
  folio: string;
  email: string;
}

/**
 * Estado del formulario de seguimiento. Una consulta válida no vuelve como estado: la Server Action guarda la
 * consulta en una cookie HttpOnly y redirige, y el resultado lo renderiza el Server Component de la página.
 */
export type LookupState =
  { status: "idle" } | { status: "invalid"; values: LookupValues; errors: { folio?: string; email?: string } };
