"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";
import { esAdmin } from "@/lib/constants";
import { distribuirEncuentro } from "@/lib/distribucion";
import { cargarPlanilla, historialPuestos, ORDEN_ENCUENTROS } from "@/lib/distribucion-datos";
import { inferirGenero } from "@/lib/logica";
import { puedeArmarTodo, puedeEditarArea } from "@/lib/distribucion-permisos";
import type { ActionState } from "@/lib/actions";

async function usuario(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error("Sesión expirada.");
  return u;
}

async function adminActual(): Promise<CurrentUser> {
  const u = await usuario();
  if (!esAdmin(u.rol)) throw new Error("Solo un administrador o pastor.");
  return u;
}

function refrescar(semanaId: string) {
  revalidatePath("/distribucion");
  revalidatePath(`/convocatorias/${semanaId}`);
}

async function generarUno(semanaId: string, encuentro: string): Promise<number> {
  const datos = await cargarPlanilla(semanaId);
  if (!datos) throw new Error("Convocatoria no encontrada.");
  const historial = await historialPuestos(datos.semana.fechaLunes);

  const puestos = datos.puestosPorEncuentro(encuentro);
  const puestoIds = new Set(puestos.map((p) => p.id));
  const fijas = datos.asignaciones
    .filter((a) => a.encuentro === encuentro && a.fija)
    .map((a) => ({ puestoId: a.puestoId, slot: a.slot, voluntarioId: a.voluntarioId }));

  const r = distribuirEncuentro({
    encuentro,
    puestos,
    disponibles: datos.disponibles(encuentro),
    fijas,
    otros: datos.otrosDe(encuentro),
    historial,
  });

  await prisma.$transaction([
    prisma.asignacionPuesto.deleteMany({ where: { semanaId, encuentro, fija: false } }),
    prisma.asignacionPuesto.createMany({
      data: r.asignaciones
        .filter((a) => puestoIds.has(a.puestoId))
        .map((a) => ({
          semanaId,
          encuentro,
          puestoId: a.puestoId,
          slot: a.slot,
          voluntarioId: a.voluntarioId,
          fija: false,
        })),
    }),
  ]);
  return r.asignaciones.length;
}

export async function generarDistribucionAction(formData: FormData) {
  const user = await usuario();
  if (!(await puedeArmarTodo(user))) throw new Error("Tu rol no puede generar la distribución completa.");
  const semanaId = String(formData.get("semanaId") ?? "");
  const encuentro = String(formData.get("encuentro") ?? "");

  const lista = encuentro === "TODOS" ? [...ORDEN_ENCUENTROS] : [encuentro];
  let total = 0;
  for (const e of lista) {
    if (!ORDEN_ENCUENTROS.includes(e as (typeof ORDEN_ENCUENTROS)[number])) throw new Error("Encuentro inválido.");
    total += await generarUno(semanaId, e); // secuencial: cada encuentro considera los anteriores
  }
  await registrarAuditoria(user, "distribucion.generar", `${encuentro}: ${total} asignaciones`);
  refrescar(semanaId);
}

export async function limpiarDistribucionAction(formData: FormData) {
  const user = await usuario();
  if (!(await puedeArmarTodo(user))) throw new Error("Sin permiso.");
  const semanaId = String(formData.get("semanaId") ?? "");
  const encuentro = String(formData.get("encuentro") ?? "");
  const todo = formData.get("todo") === "1";
  await prisma.asignacionPuesto.deleteMany({
    where: { semanaId, encuentro, ...(todo ? {} : { fija: false }) },
  });
  await registrarAuditoria(user, "distribucion.limpiar", `${encuentro}${todo ? " (todo)" : ""}`);
  refrescar(semanaId);
}

export async function asignarManualAction(formData: FormData): Promise<ActionState> {
  const user = await usuario();
  const semanaId = String(formData.get("semanaId") ?? "");
  const encuentro = String(formData.get("encuentro") ?? "");
  const puestoId = String(formData.get("puestoId") ?? "");
  const slot = Number(formData.get("slot") ?? 0);
  const voluntarioId = String(formData.get("voluntarioId") ?? "");

  const puesto = await prisma.puestoServicio.findUnique({ where: { id: puestoId }, include: { area: true } });
  if (!puesto) return { error: "Puesto no encontrado." };
  if (!(await puedeEditarArea(user, { equipoId: puesto.equipoId ?? puesto.area.equipoId }))) {
    return { error: "No puedes editar esta área." };
  }
  if (slot < 0 || slot >= puesto.cupos) return { error: "Cupo inválido." };

  if (!voluntarioId) {
    await prisma.asignacionPuesto.deleteMany({ where: { semanaId, encuentro, puestoId, slot } });
    refrescar(semanaId);
    return { ok: "Cupo liberado." };
  }

  const [vol, resp, ocupado] = await Promise.all([
    prisma.voluntario.findUnique({ where: { id: voluntarioId }, select: { nombre: true, genero: true, activo: true } }),
    prisma.respuesta.findUnique({ where: { semanaId_voluntarioId: { semanaId, voluntarioId } } }),
    prisma.asignacionPuesto.findFirst({
      where: { semanaId, encuentro, voluntarioId, NOT: { puestoId, slot } },
      include: { puesto: true },
    }),
  ]);
  if (!vol || !vol.activo) return { error: "Voluntario no válido." };
  const clave = ({ JUEVES: "disponibleJueves", DOMINGO_AM: "disponibleDomingoAM", DOMINGO_PM: "disponibleDomingoPM" } as const)[
    encuentro as "JUEVES"
  ];
  if (!clave || resp?.[clave] !== true) return { error: `${vol.nombre} no confirmó disponibilidad para este encuentro.` };
  if (puesto.genero && vol.genero !== puesto.genero) {
    return { error: `Este puesto es solo para ${puesto.genero === "F" ? "mujeres" : "hombres"} (revisa el género en la ficha).` };
  }
  if (ocupado) return { error: `${vol.nombre} ya está en “${ocupado.puesto.nombre}” en este encuentro. Quítalo primero.` };

  await prisma.asignacionPuesto.deleteMany({ where: { semanaId, encuentro, puestoId, slot } });
  await prisma.asignacionPuesto.create({
    data: { semanaId, encuentro, puestoId, slot, voluntarioId, fija: true },
  });
  await registrarAuditoria(user, "distribucion.manual", `${vol.nombre} → ${puesto.nombre} (${encuentro})`);
  refrescar(semanaId);
  return { ok: "Asignado." };
}

// ---------- Plantilla (admin) ----------

export async function sugerirGeneroAction() {
  const user = await adminActual();
  const sin = await prisma.voluntario.findMany({ where: { genero: null }, select: { id: true, nombre: true } });
  let n = 0;
  for (const v of sin) {
    const g = inferirGenero(v.nombre);
    if (g) {
      await prisma.voluntario.update({ where: { id: v.id }, data: { genero: g } });
      n++;
    }
  }
  await registrarAuditoria(user, "distribucion.sugerir_genero", `${n} de ${sin.length} completados`);
  revalidatePath("/distribucion/plantilla");
}

const puestoSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  cupos: z.coerce.number().int().min(1).max(20),
  genero: z.enum(["", "F", "M"]),
  equipoId: z.string().optional(),
});

function leerPuesto(formData: FormData) {
  return {
    nombre: formData.get("nombre"),
    cupos: formData.get("cupos"),
    genero: formData.get("genero") ?? "",
    equipoId: formData.get("equipoId") ?? "",
  };
}

const encuentrosDe = (formData: FormData) => {
  const e = formData.getAll("encuentros").map(String).filter((x) => ORDEN_ENCUENTROS.includes(x as "JUEVES"));
  return e.length ? e.join(",") : "JUEVES,DOMINGO_AM,DOMINGO_PM";
};

export async function guardarPuestoAction(formData: FormData) {
  const user = await adminActual();
  const id = String(formData.get("id") ?? "");
  const areaId = String(formData.get("areaId") ?? "");
  const p = puestoSchema.safeParse(leerPuesto(formData));
  if (!p.success) throw new Error(p.error.issues[0]?.message ?? "Datos inválidos.");
  const data = {
    nombre: p.data.nombre,
    cupos: p.data.cupos,
    genero: p.data.genero || null,
    equipoId: p.data.equipoId || null,
    rota: formData.get("rota") === "on",
    encuentros: encuentrosDe(formData),
  };
  if (id) {
    await prisma.puestoServicio.update({ where: { id }, data });
  } else {
    const max = await prisma.puestoServicio.aggregate({ where: { areaId }, _max: { orden: true } });
    await prisma.puestoServicio.create({ data: { ...data, areaId, orden: (max._max.orden ?? 0) + 1 } });
  }
  await registrarAuditoria(user, id ? "plantilla.puesto_editar" : "plantilla.puesto_crear", p.data.nombre);
  revalidatePath("/distribucion/plantilla");
  revalidatePath("/distribucion");
}

export async function eliminarPuestoAction(formData: FormData) {
  const user = await adminActual();
  const id = String(formData.get("id") ?? "");
  const p = await prisma.puestoServicio.delete({ where: { id } });
  await registrarAuditoria(user, "plantilla.puesto_eliminar", p.nombre);
  revalidatePath("/distribucion/plantilla");
  revalidatePath("/distribucion");
}

export async function guardarAreaAction(formData: FormData) {
  const user = await adminActual();
  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) throw new Error("El nombre del área es obligatorio.");
  const data = {
    nombre,
    encargado: String(formData.get("encargado") ?? "").trim() || null,
    equipoId: String(formData.get("equipoId") ?? "") || null,
    general: formData.get("general") === "on",
  };
  if (id) {
    await prisma.areaServicio.update({ where: { id }, data });
  } else {
    const max = await prisma.areaServicio.aggregate({ _max: { orden: true } });
    await prisma.areaServicio.create({ data: { ...data, orden: (max._max.orden ?? 0) + 1 } });
  }
  await registrarAuditoria(user, id ? "plantilla.area_editar" : "plantilla.area_crear", nombre);
  revalidatePath("/distribucion/plantilla");
  revalidatePath("/distribucion");
}

export async function eliminarAreaAction(formData: FormData) {
  const user = await adminActual();
  const id = String(formData.get("id") ?? "");
  const a = await prisma.areaServicio.delete({ where: { id } });
  await registrarAuditoria(user, "plantilla.area_eliminar", a.nombre);
  revalidatePath("/distribucion/plantilla");
  redirect("/distribucion/plantilla");
}

// ---------- Cabecera y encargados de la planilla ----------

export async function guardarCabeceraAction(formData: FormData) {
  const user = await usuario();
  if (!(await puedeArmarTodo(user))) throw new Error("Sin permiso.");
  const semanaId = String(formData.get("semanaId") ?? "");
  const v = (k: string) => String(formData.get(k) ?? "").trim() || null;
  await prisma.semanaServicio.update({
    where: { id: semanaId },
    data: {
      pastores: v("pastores"),
      administradoresCampus: v("administradoresCampus"),
      lideresVoluntarios: v("lideresVoluntarios"),
    },
  });
  await registrarAuditoria(user, "distribucion.cabecera", semanaId);
  refrescar(semanaId);
}

export async function guardarEncargadoAction(formData: FormData) {
  const user = await usuario();
  const semanaId = String(formData.get("semanaId") ?? "");
  const encuentro = String(formData.get("encuentro") ?? "");
  const areaId = String(formData.get("areaId") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();

  const area = await prisma.areaServicio.findUnique({ where: { id: areaId } });
  if (!area) throw new Error("Área no encontrada.");
  if (!(await puedeEditarArea(user, { equipoId: area.equipoId }))) throw new Error("No puedes editar esta área.");
  if (!ORDEN_ENCUENTROS.includes(encuentro as (typeof ORDEN_ENCUENTROS)[number])) throw new Error("Encuentro inválido.");

  if (!texto) {
    await prisma.encargadoArea.deleteMany({ where: { semanaId, encuentro, areaId } });
  } else {
    await prisma.encargadoArea.upsert({
      where: { semanaId_encuentro_areaId: { semanaId, encuentro, areaId } },
      update: { texto },
      create: { semanaId, encuentro, areaId, texto },
    });
  }
  await registrarAuditoria(user, "distribucion.encargado", `${area.nombre} (${encuentro}): ${texto || "por defecto"}`);
  refrescar(semanaId);
}
