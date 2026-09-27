import { ENCUENTROS } from "@/lib/conexion";

export type VoluntarioAlg = {
  id: string;
  nombre: string;
  equipoIds: string[];
  genero: string | null;
};

export type PuestoAlg = {
  id: string;
  areaId: string;
  areaNombre: string;
  nombre: string;
  cupos: number;
  rota: boolean;
  genero: string | null;
  /** Equipos cuyos voluntarios pueden servir aquí (ya resueltos). */
  elegibleEquipoIds: string[];
  /** Área "general": admite apoyo de voluntarios de otros equipos si hace falta. */
  general: boolean;
};

export type FijaAlg = { puestoId: string; slot: number; voluntarioId: string };

export type OtroEncuentroAlg = {
  encuentro: string;
  puestoId: string;
  puestoNombre: string;
  areaId: string;
  voluntarioId: string;
};

export type EntradaDistribucion = {
  encuentro: string;
  puestos: PuestoAlg[];
  disponibles: VoluntarioAlg[];
  fijas: FijaAlg[];
  otros: OtroEncuentroAlg[];
  /** voluntarioId -> puestoId -> veces que sirvió allí en semanas recientes. */
  historial: Record<string, Record<string, number>>;
};

export type AsignacionAlg = {
  puestoId: string;
  slot: number;
  voluntarioId: string;
  motivos: string[];
};

export type ResultadoDistribucion = {
  asignaciones: AsignacionAlg[];
  vacios: { puestoId: string; slot: number; motivo: string }[];
  sinPuesto: VoluntarioAlg[];
  avisos: string[];
};

const INFACTIBLE = 1_000_000;
const VACIO_ESPECIALIZADO = 6000;
const VACIO_GENERAL = 5000;

const etiqueta = (enc: string) => ENCUENTROS.find((e) => e.value === enc)?.label ?? enc;

/** Asignación de costo mínimo (algoritmo húngaro, filas <= columnas). Devuelve la columna elegida por fila. */
export function asignacionMinima(costo: number[][]): number[] {
  const n = costo.length;
  const m = n ? costo[0].length : 0;
  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(m + 1).fill(0);
  const p = new Array<number>(m + 1).fill(0);
  const way = new Array<number>(m + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array<number>(m + 1).fill(Infinity);
    const usado = new Array<boolean>(m + 1).fill(false);
    do {
      usado[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (usado[j]) continue;
        const cur = costo[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= m; j++) {
        if (usado[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }

  const res = new Array<number>(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j]) res[p[j] - 1] = j - 1;
  return res;
}

/** Desempate estable y repartido (evita que siempre queden los mismos por orden alfabético). */
function ruido(a: string, b: string, semilla: string): number {
  let h = 2166136261;
  for (const ch of `${a}|${b}|${semilla}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 300 / 100; // 0..3
}

/** Razones legibles de por qué una persona quedó en un puesto (sirve para propuestas y para lo ya guardado). */
export function motivosDe(v: VoluntarioAlg, puesto: PuestoAlg, otros: OtroEncuentroAlg[]): string[] {
  const motivos: string[] = ["Confirmó disponibilidad"];
  motivos.push(
    v.equipoIds.some((t) => puesto.elegibleEquipoIds.includes(t)) ? "Es del equipo de esta área" : "Apoyo desde otro equipo"
  );
  const mios = otros.filter((o) => o.voluntarioId === v.id);
  const repite = mios.filter((o) => o.puestoId === puesto.id);
  if (repite.length) {
    motivos.push(
      puesto.rota
        ? `⚠ Repite este puesto (${repite.map((o) => etiqueta(o.encuentro)).join(", ")})`
        : "Puesto fijo: se mantiene la misma persona"
    );
  } else if (mios.length) {
    motivos.push(`Cambia de puesto (antes: ${mios.map((o) => `${o.puestoNombre} en ${etiqueta(o.encuentro)}`).join("; ")})`);
  }
  return motivos;
}

export function distribuirEncuentro(entrada: EntradaDistribucion): ResultadoDistribucion {
  const { encuentro, puestos, fijas, otros, historial } = entrada;

  const ocupados = new Set(fijas.map((f) => f.voluntarioId));
  const voluntarios = entrada.disponibles
    .filter((v) => !ocupados.has(v.id))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  type Cupo = { puesto: PuestoAlg; slot: number };
  const cupos: Cupo[] = [];
  for (const puesto of puestos) {
    for (let slot = 0; slot < puesto.cupos; slot++) {
      if (!fijas.some((f) => f.puestoId === puesto.id && f.slot === slot)) cupos.push({ puesto, slot });
    }
  }

  const costoDe = (v: VoluntarioAlg, p: PuestoAlg): number => {
    if (p.genero && v.genero !== p.genero) return INFACTIBLE;
    let c = 0;
    const enPool = v.equipoIds.some((t) => p.elegibleEquipoIds.includes(t));
    if (!enPool) {
      if (!p.general) return INFACTIBLE;
      c += 40; // apoyo desde otro equipo: solo si hace falta
    }
    const mios = otros.filter((o) => o.voluntarioId === v.id);
    const mismoPuesto = mios.filter((o) => o.puestoId === p.id).length;
    c += p.rota ? mismoPuesto * 1000 : -mismoPuesto * 200;
    c += mios.filter((o) => o.areaId === p.areaId && o.puestoId !== p.id).length * 8;
    c += (historial[v.id]?.[p.id] ?? 0) * 12;
    c += ruido(v.id, p.id, encuentro);
    return c;
  };

  const n = cupos.length;
  const costo: number[][] = cupos.map(({ puesto }) => {
    const fila = voluntarios.map((v) => costoDe(v, puesto));
    const vacio = puesto.general ? VACIO_GENERAL : VACIO_ESPECIALIZADO;
    for (let k = 0; k < n; k++) fila.push(vacio);
    return fila;
  });

  const elegido = n ? asignacionMinima(costo) : [];
  const asignaciones: AsignacionAlg[] = [];
  const vacios: ResultadoDistribucion["vacios"] = [];
  const usados = new Set<string>();

  cupos.forEach(({ puesto, slot }, i) => {
    const col = elegido[i];
    const esVoluntario = col >= 0 && col < voluntarios.length && costo[i][col] < INFACTIBLE;
    if (!esVoluntario) {
      const hayEnPool = entrada.disponibles.some((v) => v.equipoIds.some((t) => puesto.elegibleEquipoIds.includes(t)));
      vacios.push({
        puestoId: puesto.id,
        slot,
        motivo: puesto.genero
          ? `No hay voluntarios disponibles (${puesto.genero === "F" ? "mujeres" : "hombres"}) para este puesto`
          : hayEnPool
            ? "Ya no quedan voluntarios disponibles del equipo"
            : "Nadie del equipo respondió que puede este encuentro",
      });
      return;
    }
    const v = voluntarios[col];
    usados.add(v.id);
    const motivos = motivosDe(v, puesto, otros);
    asignaciones.push({ puestoId: puesto.id, slot, voluntarioId: v.id, motivos });
  });

  const sinPuesto = voluntarios.filter((v) => !usados.has(v.id));

  const avisos: string[] = [];
  const faltanPorArea = new Map<string, number>();
  for (const vc of vacios) {
    const p = puestos.find((x) => x.id === vc.puestoId)!;
    faltanPorArea.set(p.areaNombre, (faltanPorArea.get(p.areaNombre) ?? 0) + 1);
  }
  for (const [area, k] of faltanPorArea) avisos.push(`${area}: faltan ${k} ${k === 1 ? "persona" : "personas"}`);
  const repeticiones = asignaciones.filter((a) => a.motivos.some((m) => m.startsWith("⚠"))).length;
  if (repeticiones) avisos.push(`${repeticiones} ${repeticiones === 1 ? "persona repite" : "personas repiten"} puesto por falta de alternativas`);
  if (sinPuesto.length) avisos.push(`${sinPuesto.length} ${sinPuesto.length === 1 ? "voluntario disponible quedó" : "voluntarios disponibles quedaron"} sin puesto`);

  return { asignaciones, vacios, sinPuesto, avisos };
}
