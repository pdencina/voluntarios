import "server-only";
import { prisma } from "@/lib/prisma";
import { ENCUENTROS, hoySantiago, sumarDias } from "@/lib/conexion";
import { cargarPlanilla } from "@/lib/distribucion-datos";
import { lunesDeSemana } from "@/lib/logica";
import { cumpleEnSemana, deficitArea, edadAl, rachaSinResponder } from "@/lib/semana";

/** null = sin filtro (administradores); lista = solo voluntarios de esos equipos. */
type Alcance = string[] | null;

const filtroVoluntario = (alcance: Alcance) =>
  alcance ? { equipos: { some: { equipoId: { in: alcance } } } } : {};

export type Cumpleanero = { id: string; nombre: string; telefono: string | null; fecha: Date; edad: number };

export async function cumpleanosDeLaSemana(alcance: Alcance): Promise<{ lunes: Date; lista: Cumpleanero[] }> {
  const lunes = lunesDeSemana(hoySantiago().fecha)!;
  const voluntarios = await prisma.voluntario.findMany({
    where: { activo: true, fechaNacimiento: { not: null }, ...filtroVoluntario(alcance) },
    select: { id: true, nombre: true, telefono: true, fechaNacimiento: true },
  });
  const lista = voluntarios
    .map((v) => {
      const fecha = cumpleEnSemana(v.fechaNacimiento!, lunes);
      return fecha ? { id: v.id, nombre: v.nombre, telefono: v.telefono, fecha, edad: edadAl(v.fechaNacimiento!, fecha) } : null;
    })
    .filter((x): x is Cumpleanero => x !== null && x.edad > 0 && x.edad < 110)
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  return { lunes, lista };
}

export type Alertas = {
  sinResponder: { id: string; nombre: string; semanas: number }[];
  sobrecargados: { id: string; nombre: string; encuentros: number }[];
  faltas: { id: string; nombre: string; faltas: number }[];
  deficits: { area: string; encuentro: string; faltan: number; disponibles: number; cupos: number }[];
  semanaProxima: Date | null;
};

export async function alertasPastorales(alcance: Alcance): Promise<Alertas> {
  const hoy = new Date(`${hoySantiago().fecha}T00:00:00.000Z`);

  // Semanas ya pasadas (su domingo ya ocurrió), de la más reciente a la más antigua.
  const semanas = await prisma.semanaServicio.findMany({ orderBy: { fechaLunes: "desc" }, take: 12 });
  const pasadas = semanas.filter((s) => sumarDias(s.fechaLunes, 6) < hoy).slice(0, 4);
  const pasadasIds = pasadas.map((s) => s.id);

  const [voluntarios, respuestas, asignaciones, asistencias] = await Promise.all([
    prisma.voluntario.findMany({ where: { activo: true, ...filtroVoluntario(alcance) }, select: { id: true, nombre: true } }),
    prisma.respuesta.findMany({ where: { semanaId: { in: pasadasIds } }, select: { semanaId: true, voluntarioId: true, respondidoAt: true } }),
    prisma.asignacionPuesto.findMany({ where: { semanaId: { in: pasadasIds } }, select: { semanaId: true, encuentro: true, voluntarioId: true } }),
    prisma.asistencia.findMany({ where: { semanaId: { in: pasadasIds } }, select: { semanaId: true, encuentro: true, voluntarioId: true } }),
  ]);
  const nombre = new Map(voluntarios.map((v) => [v.id, v.nombre]));
  const ids = new Set(voluntarios.map((v) => v.id));

  // 1) Sin responder varias semanas seguidas.
  const sinResponder: Alertas["sinResponder"] = [];
  for (const v of voluntarios) {
    const historial = pasadas
      .map((s) => respuestas.find((r) => r.semanaId === s.id && r.voluntarioId === v.id))
      .filter((r) => r !== undefined)
      .map((r) => r!.respondidoAt !== null);
    const racha = rachaSinResponder(historial);
    if (racha >= 3) sinResponder.push({ id: v.id, nombre: v.nombre, semanas: racha });
  }

  // 2) Sobrecargados: sirvieron 5 o más de los 6 encuentros de las últimas 2 semanas.
  const dosUltimas = new Set(pasadasIds.slice(0, 2));
  const conteo = new Map<string, number>();
  for (const a of asignaciones) if (dosUltimas.has(a.semanaId) && ids.has(a.voluntarioId)) conteo.set(a.voluntarioId, (conteo.get(a.voluntarioId) ?? 0) + 1);
  const sobrecargados = [...conteo.entries()]
    .filter(([, n]) => n >= 5)
    .map(([id, n]) => ({ id, nombre: nombre.get(id) ?? "", encuentros: n }));

  // 3) Faltas: tenían puesto y no marcaron llegada, solo en encuentros donde se usó el registro de llegada.
  const conRegistro = new Set(asistencias.map((a) => `${a.semanaId}:${a.encuentro}`));
  const llegaron = new Set(asistencias.map((a) => `${a.semanaId}:${a.encuentro}:${a.voluntarioId}`));
  const faltasMap = new Map<string, number>();
  for (const a of asignaciones) {
    if (!ids.has(a.voluntarioId) || !conRegistro.has(`${a.semanaId}:${a.encuentro}`)) continue;
    if (!llegaron.has(`${a.semanaId}:${a.encuentro}:${a.voluntarioId}`)) {
      faltasMap.set(a.voluntarioId, (faltasMap.get(a.voluntarioId) ?? 0) + 1);
    }
  }
  const faltas = [...faltasMap.entries()]
    .filter(([, n]) => n >= 2)
    .map(([id, n]) => ({ id, nombre: nombre.get(id) ?? "", faltas: n }));

  // 4) Áreas cortas en la próxima semana abierta, con las respuestas recibidas hasta ahora.
  const proxima = semanas
    .filter((s) => s.abierta && sumarDias(s.fechaLunes, 6) >= hoy)
    .sort((a, b) => a.fechaLunes.getTime() - b.fechaLunes.getTime())[0];
  const deficits: Alertas["deficits"] = [];
  if (proxima) {
    const datos = await cargarPlanilla(proxima.id);
    if (datos) {
      for (const enc of ENCUENTROS) {
        const disponibles = datos.disponibles(enc.value);
        const porArea = new Map<string, { cupos: number; pool: string[] }>();
        for (const p of datos.puestosPorEncuentro(enc.value)) {
          if (p.general) continue; // las áreas generales reciben apoyo de otros equipos
          const k = p.areaNombre;
          const actual = porArea.get(k) ?? { cupos: 0, pool: [] };
          actual.cupos += p.cupos;
          actual.pool = [...new Set([...actual.pool, ...p.elegibleEquipoIds])];
          porArea.set(k, actual);
        }
        for (const [area, { cupos, pool }] of porArea) {
          if (alcance && !pool.some((e) => alcance.includes(e))) continue;
          const disp = disponibles.filter((v) => v.equipoIds.some((e) => pool.includes(e))).length;
          const faltan = deficitArea(cupos, disp);
          if (faltan > 0) deficits.push({ area, encuentro: enc.largo, faltan, disponibles: disp, cupos });
        }
      }
    }
  }

  const porNombre = <T extends { nombre: string }>(l: T[]) => l.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return {
    sinResponder: porNombre(sinResponder),
    sobrecargados: porNombre(sobrecargados),
    faltas: porNombre(faltas),
    deficits,
    semanaProxima: proxima?.fechaLunes ?? null,
  };
}
