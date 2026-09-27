import { guardarRespaldo } from "@/lib/respaldo";
import { registrarAuditoria } from "@/lib/audit";
import { cronAutorizado } from "@/lib/cron";

export const maxDuration = 60;

/** Lo llama Vercel Cron cada lunes (ver vercel.json). */
export async function GET(request: Request) {
  if (!cronAutorizado(request)) return new Response("No autorizado", { status: 401 });
  const r = await guardarRespaldo("automatico");
  await registrarAuditoria(null, "respaldo.automatico", `${r.pathname} (${Math.round(r.bytes / 1024)} KB)`);
  return Response.json({ ok: true, ...r });
}
