import { revalidatePath } from "next/cache";
import { abrirSemana } from "@/lib/convocatoria";
import { registrarAuditoria } from "@/lib/audit";
import { cronAutorizado } from "@/lib/cron";
import { proximoLunes } from "@/lib/logica";

export const maxDuration = 60;

/** Cada lunes abre la convocatoria de la semana siguiente (ver vercel.json). Idempotente. */
export async function GET(request: Request) {
  if (!cronAutorizado(request)) return new Response("No autorizado", { status: 401 });
  const fechaLunes = proximoLunes();
  const { semana, nueva, agregados } = await abrirSemana(fechaLunes, null);
  await registrarAuditoria(
    null,
    "convocatoria.abrir_automatica",
    `Semana ${fechaLunes.toISOString().slice(0, 10)}${nueva ? "" : " (ya existía)"}: ${agregados} voluntarios convocados`
  );
  revalidatePath("/convocatorias");
  return Response.json({ ok: true, semanaId: semana.id, nueva, agregados });
}
