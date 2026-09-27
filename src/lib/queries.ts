import "server-only";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth";
import { FRANJAS, veTodo, type FranjaKey } from "@/lib/constants";

export async function equiposVisiblesPara(user: CurrentUser) {
  if (veTodo(user.rol)) {
    return prisma.equipo.findMany({
      orderBy: [{ tipo: "asc" }, { nombre: "asc" }],
      include: { _count: { select: { voluntarios: { where: { voluntario: { activo: true } } } } } },
    });
  }
  return prisma.equipo.findMany({
    where: { id: { in: user.equipoIds } },
    orderBy: [{ tipo: "asc" }, { nombre: "asc" }],
    include: { _count: { select: { voluntarios: { where: { voluntario: { activo: true } } } } } },
  });
}

export async function contarVoluntariosMultiEquipo() {
  const grupos = await prisma.voluntarioEquipo.groupBy({
    by: ["voluntarioId"],
    _count: { equipoId: true },
  });
  return grupos.filter((g) => g._count.equipoId >= 2).length;
}

export type ConteoFranja = { disponible: number; noDisponible: number; pendiente: number };
export type ConteoSemana = Record<FranjaKey, ConteoFranja>;

export function contarRespuestas(
  respuestas: { disponibleJueves: boolean | null; disponibleDomingoAM: boolean | null; disponibleDomingoPM: boolean | null }[]
): ConteoSemana {
  const base: ConteoSemana = {} as ConteoSemana;
  for (const f of FRANJAS) {
    let disponible = 0;
    let noDisponible = 0;
    let pendiente = 0;
    for (const r of respuestas) {
      const val = r[f.key];
      if (val === true) disponible++;
      else if (val === false) noDisponible++;
      else pendiente++;
    }
    base[f.key] = { disponible, noDisponible, pendiente };
  }
  return base;
}

export async function ultimaSemana() {
  return prisma.semanaServicio.findFirst({
    orderBy: { fechaLunes: "desc" },
  });
}

/**
 * Voluntarios activos de varios equipos con su respuesta de una semana, en una sola consulta.
 * Devuelve un mapa equipoId -> voluntarios (ordenados por nombre).
 */
export async function voluntariosPorEquipo(equipoIds: string[], semanaId: string) {
  const voluntarios = await prisma.voluntario.findMany({
    where: { activo: true, equipos: { some: { equipoId: { in: equipoIds } } } },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      equipos: { select: { equipoId: true } },
      respuestas: { where: { semanaId } },
    },
    orderBy: { nombre: "asc" },
  });
  const mapa = new Map<string, typeof voluntarios>(equipoIds.map((id) => [id, []]));
  for (const v of voluntarios) {
    for (const { equipoId } of v.equipos) mapa.get(equipoId)?.push(v);
  }
  return mapa;
}
