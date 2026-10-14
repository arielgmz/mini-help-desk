const dateTime = new Intl.DateTimeFormat("es-BO", { dateStyle: "long", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat("es-BO", { dateStyle: "long" });
const compact = new Intl.DateTimeFormat("es-BO", { dateStyle: "short", timeStyle: "short" });

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
export const formatDate = (iso: string) => dateOnly.format(new Date(iso));
export const formatCompact = (iso: string) => compact.format(new Date(iso));
