import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function secreto() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("Falta SESSION_SECRET");
  return s;
}

/** Firma corta que autoriza un enlace público (sin guardar nada en la base). */
function firmar(texto: string): string {
  return createHmac("sha256", secreto()).update(texto).digest("hex").slice(0, 32);
}

function comparar(esperada: string, recibida: string | undefined): boolean {
  if (!recibida) return false;
  const a = Buffer.from(esperada);
  const b = Buffer.from(recibida);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---- Modo reunión: un equipo responde su disponibilidad ----

export function firmaReunion(semanaId: string, equipoId: string): string {
  return firmar(`reunion:${semanaId}:${equipoId}`);
}

export function firmaValida(semanaId: string, equipoId: string, firma: string | undefined): boolean {
  return comparar(firmaReunion(semanaId, equipoId), firma);
}

export function enlaceReunion(origin: string, semanaId: string, equipoId: string): string {
  return `${origin}/reunion/${semanaId}/${equipoId}?f=${firmaReunion(semanaId, equipoId)}`;
}

// ---- Registro de llegada: QR en la entrada de un encuentro ----

export function firmaLlegada(semanaId: string, encuentro: string): string {
  return firmar(`llegada:${semanaId}:${encuentro}`);
}

export function firmaLlegadaValida(semanaId: string, encuentro: string, firma: string | undefined): boolean {
  return comparar(firmaLlegada(semanaId, encuentro), firma);
}

export function enlaceLlegada(origin: string, semanaId: string, encuentro: string): string {
  return `${origin}/llegada/${semanaId}/${encuentro}?f=${firmaLlegada(semanaId, encuentro)}`;
}
