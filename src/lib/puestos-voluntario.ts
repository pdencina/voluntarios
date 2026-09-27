import "server-only";
import { prisma } from "@/lib/prisma";
import { ORDEN_ENCUENTROS } from "@/lib/distribucion-datos";

export type PuestoSemana = {
  encuentro: string;
  puesto: string;
  area: string;
  encargado: string | null;
};

/** Puestos asignados a uno o varios voluntarios en una semana, con el encargado del área de cada encuentro. */
export async function puestosDeLaSemana(semanaId: string, voluntarioIds: string[]) {
  const [asignaciones, encargados] = await Promise.all([
    prisma.asignacionPuesto.findMany({
      where: { semanaId, voluntarioId: { in: voluntarioIds } },
      include: { puesto: { include: { area: true } } },
    }),
    prisma.encargadoArea.findMany({ where: { semanaId } }),
  ]);
  const encargadoDe = (areaId: string, encuentro: string, porDefecto: string | null) =>
    encargados.find((e) => e.areaId === areaId && e.encuentro === encuentro)?.texto ?? porDefecto;

  const mapa = new Map<string, PuestoSemana[]>(voluntarioIds.map((id) => [id, []]));
  for (const a of asignaciones) {
    mapa.get(a.voluntarioId)?.push({
      encuentro: a.encuentro,
      puesto: a.puesto.nombre,
      area: a.puesto.area.nombre,
      encargado: encargadoDe(a.puesto.areaId, a.encuentro, a.puesto.area.encargado),
    });
  }
  for (const lista of mapa.values()) {
    lista.sort((x, y) => ORDEN_ENCUENTROS.indexOf(x.encuentro as "JUEVES") - ORDEN_ENCUENTROS.indexOf(y.encuentro as "JUEVES"));
  }
  return mapa;
}

/** ¿Hay alguna asignación publicada para esa semana? (distingue "no te tocó" de "aún no se arma"). */
export async function hayDistribucion(semanaId: string): Promise<boolean> {
  return (await prisma.asignacionPuesto.count({ where: { semanaId } })) > 0;
}
