import { normalizarNombre } from "@/lib/normalize";

export function distanciaLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + costo);
    }
    prev = curr;
  }
  return prev[b.length];
}

export function nombresSimilares(a: string, b: string): boolean {
  const na = normalizarNombre(a);
  const nb = normalizarNombre(b);
  if (!na || !nb || na === nb) return na === nb && !!na;
  const ratio = 1 - distanciaLevenshtein(na, nb) / Math.max(na.length, nb.length);
  if (ratio >= 0.8) {
    const ta = na.split(' ');
    const tb = nb.split(' ');
    if (ta.length !== tb.length) return true;
    return ta.every(
      (t, i) => 1 - distanciaLevenshtein(t, tb[i]) / Math.max(t.length, tb[i].length) >= 0.7
    );
  }
  const [corto, largo] = na.length <= nb.length ? [na, nb] : [nb, na];
  return corto.split(" ").length >= 2 && largo.includes(corto);
}

/** Lunes (UTC, medianoche) de la semana que contiene la fecha yyyy-mm-dd. */
export function lunesDeSemana(fechaISO: string): Date | null {
  const m = fechaISO.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return null;
  const dia = d.getUTCDay(); // 0 = domingo
  d.setUTCDate(d.getUTCDate() - ((dia + 6) % 7));
  return d;
}

/** Próximo lunes estrictamente posterior a `base` (calendario local, resultado en UTC). */
export function proximoLunes(base = new Date()): Date {
  const d = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate()));
  const dia = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (dia === 1 ? 7 : (8 - dia) % 7 || 7));
  return d;
}

/**
 * Calcula altas y bajas de membresías respetando qué equipos puede gestionar
 * quien edita. Las membresías fuera de `permitidos` no se tocan.
 */
export function calcularMembresias(
  actuales: string[],
  deseados: string[],
  permitidos: string[] | "todos"
) {
  const puede = (id: string) => permitidos === "todos" || permitidos.includes(id);
  const deseadosOk = new Set(deseados.filter(puede));
  const agregar = [...deseadosOk].filter((id) => !actuales.includes(id));
  const quitar = actuales.filter((id) => puede(id) && !deseadosOk.has(id));
  return { agregar, quitar };
}

/** Deja solo dígitos y agrega el prefijo de Chile (56) a celulares de 9 dígitos. */
export function telefonoWhatsApp(telefono: string | null | undefined): string | null {
  const d = (telefono ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 9 && d.startsWith("9")) return `56${d}`;
  if (d.length === 8) return `569${d}`;
  return d.length >= 10 ? d : null;
}

export function enlaceWhatsApp(telefono: string | null | undefined, mensaje: string): string | null {
  const t = telefonoWhatsApp(telefono);
  return t ? `https://wa.me/${t}?text=${encodeURIComponent(mensaje)}` : null;
}

const FEMENINOS_SIN_A = new Set([
  "belkis", "daisy", "miriam", "mirian", "carmen", "ines", "beatriz", "raquel", "sol", "isabel", "abigail", "ruth",
  "esther", "yiset", "keyt", "kary", "jenny", "susy", "susi", "nicole", "michelle", "katherine", "kathy", "karin",
  "karen", "saray", "noemi", "rocio", "pilar", "mercedes", "lourdes", "dolores", "angeles", "consuelo", "marisol",
  "jazmin", "jasmin", "ivette", "ivonne", "yasna", "flor", "fanny", "fany", "melodie", "melody", "mabel", "maribel",
  "elizabeth", "lizbeth", "belen", "soledad", "trinidad", "genesis", "estefani", "stephanie", "yanira", "ninoska",
]);
const MASCULINOS_CON_A = new Set(["luca", "josua", "joshua", "elias", "matias", "tobias", "isaias", "jeremias", "zacarias", "nicolas", "bautista", "borja"]);

/** Sugerencia de género por el primer nombre. Devuelve null si no se puede saber (hay que revisarlo a mano). */
export function inferirGenero(nombreCompleto: string): "F" | "M" | null {
  const primero = normalizarNombre(nombreCompleto).split(" ")[0] ?? "";
  if (primero.length < 3) return null;
  if (FEMENINOS_SIN_A.has(primero)) return "F";
  if (MASCULINOS_CON_A.has(primero)) return "M";
  const ultima = primero.slice(-1);
  if (ultima === "a") return "F";
  if ("onsrldzxkctbgjmpqvw".includes(ultima)) return "M";
  return null;
}
