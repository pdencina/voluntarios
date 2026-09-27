import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** Crea las respuestas (con su link personal) de los voluntarios activos que aún no están en la semana. */
export async function sincronizarRespuestas(semanaId: string): Promise<number> {
  const [voluntarios, existentes] = await Promise.all([
    prisma.voluntario.findMany({ where: { activo: true }, select: { id: true } }),
    prisma.respuesta.findMany({ where: { semanaId }, select: { voluntarioId: true } }),
  ]);
  const yaTienen = new Set(existentes.map((e) => e.voluntarioId));
  const nuevos = voluntarios.filter((v) => !yaTienen.has(v.id));
  if (nuevos.length) {
    await prisma.respuesta.createMany({
      data: nuevos.map((v) => ({ semanaId, voluntarioId: v.id, token: randomBytes(24).toString("hex") })),
      skipDuplicates: true,
    });
  }
  return nuevos.length;
}

/** Abre (o reabre) la convocatoria de la semana que empieza en `fechaLunes`. Idempotente. */
export async function abrirSemana(fechaLunes: Date, creadaPorId: string | null) {
  const existente = await prisma.semanaServicio.findUnique({ where: { fechaLunes } });
  const semana =
    existente ??
    (await prisma.semanaServicio.create({ data: { fechaLunes, creadaPorId } }));
  const agregados = await sincronizarRespuestas(semana.id);
  return { semana, nueva: !existente, agregados };
}
