"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";
import { normalizarNombre } from "@/lib/normalize";
import { puedePostular } from "@/lib/constants";
import { puedeConexion } from "@/lib/conexion-acceso";
import { CATEGORIAS, ENCUENTROS, ORIGENES } from "@/lib/conexion";
import { lunesDeSemana } from "@/lib/logica";
import { sumarDias } from "@/lib/conexion";
import type { ActionState } from "@/lib/actions";

async function usuarioConexion(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !(await puedeConexion(user))) throw new Error("Sin permiso para Conexión.");
  return user;
}

const enumDe = (lista: readonly { value: string }[]) =>
  lista.map((x) => x.value) as [string, ...string[]];

const personaSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre."),
  telefono: z.string().trim().optional(),
  campus: z.string().trim().min(1, "Indica el campus."),
  fechaLlegada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Indica la fecha de llegada."),
  encuentro: z.enum(enumDe(ENCUENTROS), { message: "Elige el encuentro." }),
  categoria: z.enum(enumDe(CATEGORIAS), { message: "Elige hombre, mujer, joven o niño." }),
  origen: z.enum(enumDe(ORIGENES), { message: "Indica cómo llegó." }),
  atendidaPor: z.string().trim().optional(),
  observaciones: z.string().trim().optional(),
});

function leer(formData: FormData) {
  const g = (k: string) => formData.get(k) ?? undefined;
  return {
    nombre: g("nombre"),
    telefono: g("telefono") ?? "",
    campus: g("campus") ?? "CPA",
    fechaLlegada: g("fechaLlegada"),
    encuentro: g("encuentro"),
    categoria: g("categoria"),
    origen: g("origen"),
    atendidaPor: g("atendidaPor") ?? "",
    observaciones: g("observaciones") ?? "",
  };
}

export async function crearPersonaNuevaAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await usuarioConexion();
  const parsed = personaSchema.safeParse(leer(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;
  const fecha = new Date(`${d.fechaLlegada}T00:00:00.000Z`);
  if (Number.isNaN(fecha.getTime())) return { error: "Fecha inválida." };

  const lunes = lunesDeSemana(d.fechaLlegada)!;
  const semana = await prisma.personaNueva.findMany({
    where: { fechaLlegada: { gte: lunes, lt: sumarDias(lunes, 7) } },
    select: { nombre: true },
  });
  const repetida = semana.find((p) => normalizarNombre(p.nombre) === normalizarNombre(d.nombre));
  if (repetida) return { error: `“${repetida.nombre}” ya está registrada esta semana.` };

  await prisma.personaNueva.create({
    data: {
      nombre: d.nombre,
      telefono: d.telefono || null,
      campus: d.campus,
      fechaLlegada: fecha,
      encuentro: d.encuentro,
      categoria: d.categoria,
      origen: d.origen,
      atendidaPor: d.atendidaPor || user.nombre,
      observaciones: d.observaciones || null,
      creadaPorId: user.id,
    },
  });
  await registrarAuditoria(user, "conexion.registrar", d.nombre);
  revalidatePath("/conexion");
  return { ok: `${d.nombre} registrada.` };
}

export async function actualizarPersonaNuevaAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await usuarioConexion();
  const id = String(formData.get("id") ?? "");
  const parsed = personaSchema.safeParse(leer(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;
  await prisma.personaNueva.update({
    where: { id },
    data: {
      nombre: d.nombre,
      telefono: d.telefono || null,
      campus: d.campus,
      fechaLlegada: new Date(`${d.fechaLlegada}T00:00:00.000Z`),
      encuentro: d.encuentro,
      categoria: d.categoria,
      origen: d.origen,
      atendidaPor: d.atendidaPor || null,
      observaciones: d.observaciones || null,
    },
  });
  await registrarAuditoria(user, "conexion.editar", d.nombre);
  revalidatePath("/conexion");
  revalidatePath(`/conexion/${id}`);
  return { ok: "Cambios guardados." };
}

const ORDEN = ["NUEVA", "CONTACTADA", "PASO_1", "PASO_2"];

export async function avanzarPersonaAction(formData: FormData) {
  const user = await usuarioConexion();
  const id = String(formData.get("id") ?? "");
  const destino = String(formData.get("estado") ?? "");
  if (!ORDEN.includes(destino)) throw new Error("Estado inválido.");
  const p = await prisma.personaNueva.findUnique({ where: { id } });
  if (!p) throw new Error("Persona no encontrada.");

  const fechaTxt = String(formData.get("fecha") ?? "");
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaTxt)
    ? new Date(`${fechaTxt}T00:00:00.000Z`)
    : new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

  const idx = ORDEN.indexOf(destino);
  // Al marcar un paso se dan por realizados los anteriores (sin pisar fechas existentes).
  await prisma.personaNueva.update({
    where: { id },
    data: {
      estado: idx >= ORDEN.indexOf(p.estado) ? destino : p.estado,
      contactadaAt: idx >= 1 ? (p.contactadaAt ?? fecha) : p.contactadaAt,
      paso1At: idx >= 2 ? (p.paso1At ?? fecha) : p.paso1At,
      paso2At: idx >= 3 ? (p.paso2At ?? fecha) : p.paso2At,
    },
  });
  await registrarAuditoria(user, `conexion.${destino.toLowerCase()}`, p.nombre);
  revalidatePath("/conexion");
  revalidatePath(`/conexion/${id}`);
  revalidatePath("/conexion/reporte");
}

export async function eliminarPersonaNuevaAction(formData: FormData) {
  const user = await usuarioConexion();
  const id = String(formData.get("id") ?? "");
  const p = await prisma.personaNueva.findUnique({ where: { id } });
  if (!p) return;
  await prisma.personaNueva.delete({ where: { id } });
  await registrarAuditoria(user, "conexion.eliminar", p.nombre);
  revalidatePath("/conexion");
  redirect("/conexion");
}

export async function pasarAIngresoVoluntariadoAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !puedePostular(user.rol)) {
    return { error: "Solo administradores o pastores pueden iniciar un ingreso al voluntariado." };
  }
  const id = String(formData.get("id") ?? "");
  const p = await prisma.personaNueva.findUnique({ where: { id } });
  if (!p) return { error: "Persona no encontrada." };
  if (!p.telefono) return { error: "Falta el teléfono: agrégalo primero para que el líder pueda contactarla." };
  if (p.categoria === "NINO") return { error: "Los niños no ingresan al voluntariado." };

  const nombreNorm = normalizarNombre(p.nombre);
  const [yaVol, enCurso] = await Promise.all([
    prisma.voluntario.findFirst({ where: { nombreNormalizado: nombreNorm } }),
    prisma.postulacion.findMany({
      where: { estado: { in: ["PENDIENTE", "ACEPTADA", "AUN_NO"] } },
      select: { nombre: true },
    }),
  ]);
  if (yaVol) return { error: `“${yaVol.nombre}” ya es voluntario/a.` };
  if (enCurso.some((e) => normalizarNombre(e.nombre) === nombreNorm)) {
    return { error: "Ya hay un ingreso en curso para esta persona." };
  }

  const nueva = await prisma.postulacion.create({
    data: {
      nombre: p.nombre,
      telefono: p.telefono,
      tiempoIglesia: "MENOS_6M",
      observaciones: `Viene de Conexión (${p.campus}). Llegó el ${p.fechaLlegada.toISOString().slice(0, 10)}; estado: ${p.estado}.${p.observaciones ? " " + p.observaciones : ""}`,
      creadaPorId: user.id,
    },
  });
  await registrarAuditoria(user, "conexion.pasar_a_ingreso", p.nombre);
  revalidatePath("/ingreso-voluntariado");
  redirect(`/ingreso-voluntariado/${nueva.id}`);
}
