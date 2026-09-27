export const PREFIJO_RESPALDOS = "respaldos/";
export const RESPALDOS_A_CONSERVAR = 12;

/** Nombre del archivo: ordenable por fecha y legible (hora de Santiago). */
export function nombreRespaldo(fecha: Date, origen: "automatico" | "manual"): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return `${PREFIJO_RESPALDOS}respaldo-${g("year")}-${g("month")}-${g("day")}_${g("hour")}${g("minute")}-${origen}.xlsx`;
}

/** Respaldos que sobran: se conservan los más recientes. */
export function respaldosAEliminar<T extends { pathname: string; uploadedAt: Date }>(
  lista: T[],
  conservar = RESPALDOS_A_CONSERVAR
): T[] {
  return [...lista]
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
    .slice(conservar);
}

/** Evita que alguien pida por la URL un archivo fuera de la carpeta de respaldos. */
export function rutaRespaldoValida(pathname: string | null): pathname is string {
  return !!pathname && pathname.startsWith(PREFIJO_RESPALDOS) && !pathname.includes("..") && pathname.endsWith(".xlsx");
}
