export const ENCUENTROS = [
  { value: "JUEVES", label: "Jueves", largo: "Jueves 8 PM", hora: "8:00 pm", diaOffset: 3 },
  { value: "DOMINGO_AM", label: "Domingo AM", largo: "Domingo 11 AM", hora: "11:00 am", diaOffset: 6 },
  { value: "DOMINGO_PM", label: "Domingo PM", largo: "Domingo 6 PM", hora: "6:00 pm", diaOffset: 6 },
] as const;

export const CATEGORIAS = [
  { value: "HOMBRE", label: "Hombre", plural: "Hombres" },
  { value: "MUJER", label: "Mujer", plural: "Mujeres" },
  { value: "JOVEN", label: "Joven", plural: "Jóvenes" },
  { value: "NINO", label: "Niño/a", plural: "Niños" },
] as const;

export const ORIGENES = [
  { value: "RRSS", label: "Redes sociales" },
  { value: "AMIGOS_FAMILIA", label: "Amigos / familia" },
  { value: "OTRO", label: "Otro" },
] as const;

export const ESTADOS_PERSONA = {
  NUEVA: { label: "Nueva", color: "bg-slate-100 text-slate-700" },
  CONTACTADA: { label: "Contactada", color: "bg-sky-100 text-sky-800" },
  PASO_1: { label: "Paso 1", color: "bg-amber-100 text-amber-800" },
  PASO_2: { label: "Paso 2", color: "bg-emerald-100 text-emerald-800" },
} as const;

export type PersonaReporte = {
  fechaLlegada: Date;
  encuentro: string;
  categoria: string;
  origen: string;
  campus: string;
  paso1At: Date | null;
  paso2At: Date | null;
};

const DIA = 86400000;

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * DIA);
}

export function formatoFecha(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

function enSemana(fecha: Date | null, lunes: Date): boolean {
  if (!fecha) return false;
  const t = fecha.getTime();
  return t >= lunes.getTime() && t < lunes.getTime() + 7 * DIA;
}

export type ResumenEncuentro = {
  encuentro: string;
  fecha: Date;
  total: number;
  porCategoria: Record<string, number>;
};

export type ResumenSemana = {
  lunes: Date;
  total: number;
  encuentros: ResumenEncuentro[];
  porOrigen: Record<string, number>;
  paso1: number;
  paso2: number;
};

/** Resume una semana (lunes a domingo) para las personas de un campus. */
export function resumenSemana(personas: PersonaReporte[], lunes: Date): ResumenSemana {
  const llegadas = personas.filter((p) => enSemana(p.fechaLlegada, lunes));
  const encuentros = ENCUENTROS.map((e) => {
    const delEncuentro = llegadas.filter((p) => p.encuentro === e.value);
    return {
      encuentro: e.value,
      fecha: sumarDias(lunes, e.diaOffset),
      total: delEncuentro.length,
      porCategoria: Object.fromEntries(
        CATEGORIAS.map((c) => [c.value, delEncuentro.filter((p) => p.categoria === c.value).length])
      ),
    };
  });
  return {
    lunes,
    total: llegadas.length,
    encuentros,
    porOrigen: Object.fromEntries(
      ORIGENES.map((o) => [o.value, llegadas.filter((p) => p.origen === o.value).length])
    ),
    paso1: personas.filter((p) => enSemana(p.paso1At, lunes)).length,
    paso2: personas.filter((p) => enSemana(p.paso2At, lunes)).length,
  };
}

/** Fecha de hoy (yyyy-mm-dd) y encuentro probable, en hora de Santiago. */
export function hoySantiago(ahora = new Date()): { fecha: string; encuentroSugerido: string } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(ahora);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const fecha = `${get("year")}-${get("month")}-${get("day")}`;
  const hora = Number(get("hour"));
  const encuentroSugerido =
    get("weekday") === "Sun" ? (hora < 15 ? "DOMINGO_AM" : "DOMINGO_PM") : "JUEVES";
  return { fecha, encuentroSugerido };
}

export function textoReporte(opts: {
  campus: string;
  lunes: Date;
  personas: PersonaReporte[];
  lideres: string | null;
}): string {
  const r = resumenSemana(opts.personas, opts.lunes);
  const guion = (n: number) => (n > 0 ? String(n) : "-");
  const lineas: string[] = [
    "Buenos días Pas, Dios les bendiga. Les dejamos el reporte de la semana que recién pasó.",
    "",
    `Campus: ${opts.campus}`,
    `Semana del ${formatoFecha(opts.lunes)} al ${formatoFecha(sumarDias(opts.lunes, 6))}`,
    `Total nuevos asistentes: ${r.total}`,
  ];
  for (const e of r.encuentros) {
    const label = ENCUENTROS.find((x) => x.value === e.encuentro)?.label ?? e.encuentro;
    lineas.push("", `Fecha: ${formatoFecha(e.fecha)}`, `Encuentro: ${label}`, `Total asistentes: ${e.total}`, "", "*Asistencia*");
    for (const c of CATEGORIAS) lineas.push(`- ${c.plural}: ${e.porCategoria[c.value]}`);
  }
  lineas.push(
    "",
    `Asistentes por RRSS: ${r.porOrigen.RRSS}`,
    `Asistentes por amigos / familia: ${r.porOrigen.AMIGOS_FAMILIA}`
  );
  if (r.porOrigen.OTRO > 0) lineas.push(`Asistentes por otro medio: ${r.porOrigen.OTRO}`);
  lineas.push(
    "",
    `Asistentes experiencia paso 1: ${guion(r.paso1)}`,
    `Asistentes experiencia paso 2: ${guion(r.paso2)}`,
    "",
    `*TOTAL SEMANA:* ${r.total}`,
    "",
    "*Líderes Equipo Conexión*:",
    opts.lideres ?? "—"
  );
  return lineas.join("\n");
}
