"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";
import { normalizarNombre } from "@/lib/normalize";
import { TIEMPO_IGLESIA, esAdmin, puedePostular } from "@/lib/constants";
import type { ActionState } from "@/lib/actions";

async function usuarioActual(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesión expirada.");
  return user;
}

async function adminActual(): Promise<CurrentUser> {
  const user = await usuarioActual();
  if (!esAdmin(user.rol)) throw new Error("Solo un administrador o pastor puede decidir.");
  return user;
}

const tiempos = TIEMPO_IGLESIA.map((t) => t.value) as [string, ...string[]];

const postulacionSchema = z.object({
  nombre: z.string().trim().min(3, "Escribe el nombre completo."),
  telefono: z.string().trim().min(8, "El teléfono es necesario para que el líder lo contacte."),
  correo: z
    .string()
    .trim()
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "Correo inválido."),
  fechaNacimiento: z.string().trim().optional(),
  tiempoIglesia: z.enum(tiempos, { message: "Indica cuánto tiempo lleva en la iglesia." }),
  equipoInteresId: z.string().trim().optional(),
  recomendadoPor: z.string().trim().optional(),
  observaciones: z.string().trim().optional(),
});

export async function crearPostulacionAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await usuarioActual();
  if (!puedePostular(user.rol)) return { error: "Tu rol no puede registrar ingresos." };

  const parsed = postulacionSchema.safeParse({
    nombre: formData.get("nombre"),
    telefono: formData.get("telefono") ?? "",
    correo: formData.get("correo") ?? "",
    fechaNacimiento: formData.get("fechaNacimiento") ?? "",
    tiempoIglesia: formData.get("tiempoIglesia"),
    equipoInteresId: formData.get("equipoInteresId") ?? "",
    recomendadoPor: formData.get("recomendadoPor") ?? "",
    observaciones: formData.get("observaciones") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;

  let fecha: Date | null = null;
  if (d.fechaNacimiento) {
    fecha = new Date(`${d.fechaNacimiento}T00:00:00.000Z`);
    if (Number.isNaN(fecha.getTime())) return { error: "Fecha de nacimiento inválida." };
  }

  const normalizado = normalizarNombre(d.nombre);
  const yaVoluntario = await prisma.voluntario.findFirst({
    where: { nombreNormalizado: normalizado },
  });
  if (yaVoluntario) {
    return { error: `“${yaVoluntario.nombre}” ya es voluntario/a del sistema.` };
  }
  const enCurso = await prisma.postulacion.findMany({
    where: { estado: { in: ["PENDIENTE", "ACEPTADA", "AUN_NO"] } },
    select: { nombre: true },
  });
  const duplicada = enCurso.find((e) => normalizarNombre(e.nombre) === normalizado);
  if (duplicada) {
    return { error: `Ya hay un ingreso en curso para “${duplicada.nombre}”.` };
  }

  const p = await prisma.postulacion.create({
    data: {
      nombre: d.nombre,
      telefono: d.telefono,
      correo: d.correo || null,
      fechaNacimiento: fecha,
      tiempoIglesia: d.tiempoIglesia,
      equipoInteresId: d.equipoInteresId || null,
      recomendadoPor: d.recomendadoPor || null,
      observaciones: d.observaciones || null,
      creadaPorId: user.id,
    },
  });
  await registrarAuditoria(user, "postulacion.crear", d.nombre);
  revalidatePath("/ingreso-voluntariado");
  redirect(`/ingreso-voluntariado/${p.id}`);
}

export async function decidirPostulacionAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await adminActual();
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const obs = String(formData.get("observacion") ?? "").trim();
  if (decision !== "ACEPTADA" && decision !== "AUN_NO") return { error: "Decisión inválida." };
  if (decision === "AUN_NO" && obs.length < 3) {
    return { error: "Deja una observación para explicar por qué aún no." };
  }

  const p = await prisma.postulacion.findUnique({ where: { id } });
  if (!p) return { error: "Registro no encontrado." };
  if (p.estado === "INTEGRADA") return { error: "Esta persona ya fue integrada a un equipo." };

  await prisma.postulacion.update({
    where: { id },
    data: {
      estado: decision,
      decisionObs: obs || null,
      decididaPorId: user.id,
      decididaAt: new Date(),
    },
  });
  await registrarAuditoria(user, `postulacion.${decision.toLowerCase()}`, p.nombre);
  revalidatePath("/ingreso-voluntariado");
  revalidatePath(`/ingreso-voluntariado/${id}`);
  return { ok: decision === "ACEPTADA" ? "Ingreso aceptado." : "Guardado como “aún no”." };
}

export async function integrarPostulacionAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await adminActual();
  const id = String(formData.get("id") ?? "");
  const equipoId = String(formData.get("equipoId") ?? "");
  if (!equipoId) return { error: "Elige el equipo al que se integrará." };

  const [p, equipo] = await Promise.all([
    prisma.postulacion.findUnique({ where: { id } }),
    prisma.equipo.findUnique({ where: { id: equipoId } }),
  ]);
  if (!p) return { error: "Registro no encontrado." };
  if (!equipo) return { error: "Equipo no encontrado." };
  if (p.estado !== "ACEPTADA") return { error: "Primero debe estar aceptada." };

  const normalizado = normalizarNombre(p.nombre);
  const tiempo = TIEMPO_IGLESIA.find((t) => t.value === p.tiempoIglesia)?.label ?? p.tiempoIglesia;
  const notas = [
    `Ingreso al voluntariado: ${tiempo} en la iglesia`,
    p.recomendadoPor ? `recomendado/a por ${p.recomendadoPor}` : null,
    p.observaciones,
  ]
    .filter(Boolean)
    .join(" · ");

  const existente = await prisma.voluntario.findFirst({ where: { nombreNormalizado: normalizado } });

  await prisma.$transaction(async (tx) => {
    const voluntario =
      existente ??
      (await tx.voluntario.create({
        data: {
          nombre: p.nombre,
          nombreNormalizado: normalizado,
          telefono: p.telefono,
          correo: p.correo,
          fechaNacimiento: p.fechaNacimiento,
          observaciones: notas,
        },
      }));
    await tx.voluntarioEquipo.upsert({
      where: { voluntarioId_equipoId: { voluntarioId: voluntario.id, equipoId } },
      update: {},
      create: { voluntarioId: voluntario.id, equipoId },
    });
    await tx.postulacion.update({
      where: { id },
      data: {
        estado: "INTEGRADA",
        voluntarioId: voluntario.id,
        equipoAsignadoId: equipoId,
        integradaAt: new Date(),
      },
    });
  });

  await registrarAuditoria(user, "postulacion.integrar", `${p.nombre} → ${equipo.nombre}`);
  revalidatePath("/ingreso-voluntariado");
  revalidatePath("/bienvenidas");
  revalidatePath("/voluntarios");
  redirect(`/ingreso-voluntariado/${id}`);
}

export async function avisarLiderAction(formData: FormData) {
  const user = await adminActual();
  const id = String(formData.get("id") ?? "");
  await prisma.postulacion.update({ where: { id }, data: { liderAvisadoAt: new Date() } });
  await registrarAuditoria(user, "postulacion.lider_avisado", id);
  revalidatePath("/bienvenidas");
  revalidatePath(`/ingreso-voluntariado/${id}`);
}

export async function marcarBienvenidaAction(formData: FormData) {
  const user = await usuarioActual();
  const id = String(formData.get("id") ?? "");
  const p = await prisma.postulacion.findUnique({ where: { id } });
  if (!p || p.estado !== "INTEGRADA") throw new Error("Registro no válido.");
  const esLiderDelEquipo = !!p.equipoAsignadoId && user.equipoIds.includes(p.equipoAsignadoId);
  if (!esAdmin(user.rol) && !esLiderDelEquipo) throw new Error("Sin permiso.");

  await prisma.postulacion.update({
    where: { id },
    data: { bienvenidaAt: new Date(), bienvenidaPorId: user.id },
  });
  await registrarAuditoria(user, "postulacion.bienvenida", p.nombre);
  revalidatePath("/bienvenidas");
  revalidatePath(`/ingreso-voluntariado/${id}`);
  revalidatePath("/");
}
