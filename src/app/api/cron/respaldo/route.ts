import { timingSafeEqual } from "node:crypto";
import { guardarRespaldo } from "@/lib/respaldo";
import { registrarAuditoria } from "@/lib/audit";

export const maxDuration = 60;

function autorizado(request: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const esperado = Buffer.from(`Bearer ${secreto}`);
  const recibido = Buffer.from(request.headers.get("authorization") ?? "");
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

/** Lo llama Vercel Cron cada semana (ver vercel.json). */
export async function GET(request: Request) {
  if (!autorizado(request)) return new Response("No autorizado", { status: 401 });
  const r = await guardarRespaldo("automatico");
  await registrarAuditoria(null, "respaldo.automatico", `${r.pathname} (${Math.round(r.bytes / 1024)} KB)`);
  return Response.json({ ok: true, ...r });
}
