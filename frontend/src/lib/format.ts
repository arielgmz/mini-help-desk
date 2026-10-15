// Zona horaria fija de la entidad: las fechas se ven igual si se formatean en el servidor (UTC) o en el navegador.
export const DISPLAY_TIME_ZONE = "America/La_Paz";

const dateTime = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: DISPLAY_TIME_ZONE,
});
const dateOnly = new Intl.DateTimeFormat("es-BO", { dateStyle: "long", timeZone: DISPLAY_TIME_ZONE });
const compact = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: DISPLAY_TIME_ZONE,
});

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
export const formatDate = (iso: string) => dateOnly.format(new Date(iso));
export const formatCompact = (iso: string) => compact.format(new Date(iso));
