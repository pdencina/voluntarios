import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Vercel Cron envía `Authorization: Bearer <CRON_SECRET>`; nadie más debe poder disparar estas rutas. */
export function cronAutorizado(request: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const esperado = Buffer.from(`Bearer ${secreto}`);
  const recibido = Buffer.from(request.headers.get("authorization") ?? "");
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}
