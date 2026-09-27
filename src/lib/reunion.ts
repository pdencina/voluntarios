import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function secreto() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("Falta SESSION_SECRET");
  return s;
}

/** Firma que autoriza el link de reunión de un equipo para una semana (sin guardar nada en la base). */
export function firmaReunion(semanaId: string, equipoId: string): string {
  return createHmac("sha256", secreto())
    .update(`reunion:${semanaId}:${equipoId}`)
    .digest("hex")
    .slice(0, 32);
}

export function firmaValida(semanaId: string, equipoId: string, firma: string | undefined): boolean {
  if (!firma) return false;
  const esperada = Buffer.from(firmaReunion(semanaId, equipoId));
  const recibida = Buffer.from(firma);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

export function enlaceReunion(origin: string, semanaId: string, equipoId: string): string {
  return `${origin}/reunion/${semanaId}/${equipoId}?f=${firmaReunion(semanaId, equipoId)}`;
}
