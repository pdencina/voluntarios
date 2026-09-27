import "server-only";
import { prisma } from "@/lib/prisma";
import { CABECERA_DEFECTO, FRANJAS } from "@/lib/constants";
import type { OtroEncuentroAlg, PuestoAlg, VoluntarioAlg } from "@/lib/distribucion";

export const CLAVE_FRANJA: Record<string, (typeof FRANJAS)[number]["key"]> = {
  JUEVES: "disponibleJueves",
  DOMINGO_AM: "disponibleDomingoAM",
  DOMINGO_PM: "disponibleDomingoPM",
};

export const ORDEN_ENCUENTROS = ["JUEVES", "DOMINGO_AM", "DOMINGO_PM"] as const;

export async function cargarPlanilla(semanaId: string) {
  const [semana, areas, equiposRot, voluntarios, respuestas, asignaciones, encargados] = await Promise.all([
    prisma.semanaServicio.findUnique({ where: { id: semanaId } }),
    prisma.areaServicio.findMany({
      orderBy: { orden: "asc" },
      include: { puestos: { orderBy: { orden: "asc" } } },
    }),
    prisma.equipo.findMany({ where: { tipo: "ROTATIVO" }, select: { id: true } }),
    prisma.voluntario.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, genero: true, equipos: { select: { equipoId: true } } },
    }),
    prisma.respuesta.findMany({ where: { semanaId } }),
    prisma.asignacionPuesto.findMany({ where: { semanaId } }),
    prisma.encargadoArea.findMany({ where: { semanaId } }),
  ]);
  if (!semana) return null;

  // Cabecera: lo de esta semana, si no, lo más reciente de semanas anteriores, si no, los valores por defecto.
  const previa = await prisma.semanaServicio.findFirst({
    where: {
      fechaLunes: { lt: semana.fechaLunes },
      OR: [{ pastores: { not: null } }, { administradoresCampus: { not: null } }, { lideresVoluntarios: { not: null } }],
    },
    orderBy: { fechaLunes: "desc" },
  });
  const cabecera = {
    pastores: semana.pastores ?? previa?.pastores ?? CABECERA_DEFECTO.pastores,
    administradoresCampus: semana.administradoresCampus ?? previa?.administradoresCampus ?? CABECERA_DEFECTO.administradoresCampus,
    lideresVoluntarios: semana.lideresVoluntarios ?? previa?.lideresVoluntarios ?? CABECERA_DEFECTO.lideresVoluntarios,
  };
  const encargadoDe = (areaId: string, encuentro: string): string | null => {
    const o = encargados.find((x) => x.areaId === areaId && x.encuentro === encuentro);
    return o ? o.texto : (areas.find((a) => a.id === areaId)?.encargado ?? null);
  };

  const rotativoIds = equiposRot.map((e) => e.id);
  const vols: VoluntarioAlg[] = voluntarios.map((v) => ({
    id: v.id,
    nombre: v.nombre,
    genero: v.genero,
    equipoIds: v.equipos.map((e) => e.equipoId),
  }));
  const respPorVol = new Map(respuestas.map((r) => [r.voluntarioId, r]));

  const puestosPorEncuentro = (encuentro: string): PuestoAlg[] =>
    areas.flatMap((a) =>
      a.puestos
        .filter((p) => p.encuentros.split(",").includes(encuentro))
        .map((p) => ({
          id: p.id,
          areaId: a.id,
          areaNombre: a.nombre,
          nombre: p.nombre,
          cupos: p.cupos,
          rota: p.rota,
          genero: p.genero,
          general: a.general,
          elegibleEquipoIds: p.equipoId ? [p.equipoId] : a.equipoId ? [a.equipoId] : a.general ? rotativoIds : [],
        }))
    );

  const disponibles = (encuentro: string): VoluntarioAlg[] =>
    vols.filter((v) => respPorVol.get(v.id)?.[CLAVE_FRANJA[encuentro]] === true);

  const otrosDe = (encuentro: string): OtroEncuentroAlg[] => {
    const puestoInfo = new Map(areas.flatMap((a) => a.puestos.map((p) => [p.id, { nombre: p.nombre, areaId: a.id }] as const)));
    return asignaciones
      .filter((x) => x.encuentro !== encuentro)
      .map((x) => ({
        encuentro: x.encuentro,
        puestoId: x.puestoId,
        puestoNombre: puestoInfo.get(x.puestoId)?.nombre ?? "",
        areaId: puestoInfo.get(x.puestoId)?.areaId ?? "",
        voluntarioId: x.voluntarioId,
      }));
  };

  return { semana, cabecera, encargadoDe, areas, rotativoIds, vols, respPorVol, asignaciones, puestosPorEncuentro, disponibles, otrosDe };
}

/** Veces que cada voluntario sirvió en cada puesto en las últimas semanas anteriores a la indicada. */
export async function historialPuestos(fechaLunes: Date, semanas = 4) {
  const previas = await prisma.semanaServicio.findMany({
    where: { fechaLunes: { lt: fechaLunes } },
    orderBy: { fechaLunes: "desc" },
    take: semanas,
    select: { id: true },
  });
  if (!previas.length) return {} as Record<string, Record<string, number>>;
  const filas = await prisma.asignacionPuesto.findMany({
    where: { semanaId: { in: previas.map((s) => s.id) } },
    select: { voluntarioId: true, puestoId: true },
  });
  const h: Record<string, Record<string, number>> = {};
  for (const f of filas) {
    h[f.voluntarioId] ??= {};
    h[f.voluntarioId][f.puestoId] = (h[f.voluntarioId][f.puestoId] ?? 0) + 1;
  }
  return h;
}
