import { ENCUENTROS, sumarDias } from "@/lib/conexion";

const DIA = 86400000;

/** Encuentros que caen en la fecha indicada (yyyy-mm-dd) para la semana que parte en `lunes`. */
export function encuentrosDelDia(lunes: Date, fechaISO: string): string[] {
  return ENCUENTROS.filter((e) => sumarDias(lunes, e.diaOffset).toISOString().slice(0, 10) === fechaISO).map(
    (e) => e.value
  );
}

/** Fecha (UTC medianoche) en que cae el cumpleaños dentro de la semana [lunes, lunes+6], o null. */
export function cumpleEnSemana(nacimiento: Date, lunes: Date): Date | null {
  const mes = nacimiento.getUTCMonth();
  const dia = nacimiento.getUTCDate();
  for (let i = 0; i < 7; i++) {
    const d = new Date(lunes.getTime() + i * DIA);
    const y = d.getUTCFullYear();
    const bisiesto = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    // Los nacidos un 29 de febrero celebran el 28 en años no bisiestos.
    const [m, dd] = mes === 1 && dia === 29 && !bisiesto ? [1, 28] : [mes, dia];
    if (d.getUTCMonth() === m && d.getUTCDate() === dd) return d;
  }
  return null;
}

export function edadAl(nacimiento: Date, fecha: Date): number {
  let edad = fecha.getUTCFullYear() - nacimiento.getUTCFullYear();
  const antes =
    fecha.getUTCMonth() < nacimiento.getUTCMonth() ||
    (fecha.getUTCMonth() === nacimiento.getUTCMonth() && fecha.getUTCDate() < nacimiento.getUTCDate());
  if (antes) edad--;
  return edad;
}

/** Semanas seguidas (desde la más reciente) sin responder. `respondio` va de la más reciente a la más antigua. */
export function rachaSinResponder(respondio: boolean[]): number {
  let n = 0;
  for (const r of respondio) {
    if (r) break;
    n++;
  }
  return n;
}

/**
 * Déficit por área para un encuentro: cupos que no alcanzan a cubrirse con los voluntarios
 * disponibles de los equipos que pueden servir en ella.
 */
export function deficitArea(cupos: number, disponiblesDelEquipo: number): number {
  return Math.max(0, cupos - disponiblesDelEquipo);
}
