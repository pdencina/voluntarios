"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  getCurrentUser,
  verifyPassword,
} from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";
import { lunesDeSemana, proximoLunes } from "@/lib/logica";
import { puedeConvocar, type RolUsuario } from "@/lib/constants";
import { LIMITES_LOGIN, ipDeCabeceras, motivoBloqueo } from "@/lib/limites";

export type ActionState = { error?: string; ok?: string } | undefined;

// ---------- Login / logout ----------

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "Datos inválidos." };
  }

  const { password, next } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();
  const h = await headers();
  const ip = ipDeCabeceras(h.get("x-forwarded-for"), h.get("x-real-ip"));

  const desde = new Date(Date.now() - LIMITES_LOGIN.ventanaMs);
  const [cuentaEIp, cuenta, deIp] = await Promise.all([
    prisma.loginIntento.count({ where: { clave: email, ip, createdAt: { gte: desde } } }),
    prisma.loginIntento.count({ where: { clave: email, createdAt: { gte: desde } } }),
    prisma.loginIntento.count({ where: { ip, createdAt: { gte: desde } } }),
  ]);
  const bloqueo = motivoBloqueo({ cuentaEIp, cuenta, ip: deIp });
  if (bloqueo) return { error: bloqueo };

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  const vigente = !usuario?.expiraEn || usuario.expiraEn.getTime() > Date.now();
  const ok = usuario && vigente ? await verifyPassword(password, usuario.passwordHash) : false;
  if (!usuario || !ok) {
    await prisma.loginIntento.create({ data: { clave: email, ip } });
    await prisma.loginIntento.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86400000) } } });
    return { error: "Correo o contraseña incorrectos." };
  }

  await prisma.loginIntento.deleteMany({ where: { clave: email, ip } });
  await createSession({
    sub: usuario.id,
    rol: usuario.rol as RolUsuario,
    nombre: usuario.nombre,
    v: usuario.sesionVersion,
  });

  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

// ---------- Convocatorias ----------

async function sincronizarRespuestas(semanaId: string) {
  const [voluntarios, existentes] = await Promise.all([
    prisma.voluntario.findMany({ where: { activo: true }, select: { id: true } }),
    prisma.respuesta.findMany({ where: { semanaId }, select: { voluntarioId: true } }),
  ]);
  const yaTienen = new Set(existentes.map((e) => e.voluntarioId));
  const nuevos = voluntarios.filter((v) => !yaTienen.has(v.id));
  if (nuevos.length) {
    await prisma.respuesta.createMany({
      data: nuevos.map((v) => ({
        semanaId,
        voluntarioId: v.id,
        token: randomBytes(24).toString("hex"),
      })),
    });
  }
  return nuevos.length;
}

export async function crearConvocatoriaAction(formData?: FormData) {
  const user = await getCurrentUser();
  if (!user || !puedeConvocar(user.rol)) {
    throw new Error("No tienes permiso para abrir una convocatoria.");
  }

  const fechaInput = formData?.get("fecha");
  const fechaLunes =
    (typeof fechaInput === "string" && fechaInput ? lunesDeSemana(fechaInput) : null) ??
    proximoLunes();

  const semana = await prisma.semanaServicio.upsert({
    where: { fechaLunes },
    update: {},
    create: { fechaLunes, creadaPorId: user.id },
  });
  await sincronizarRespuestas(semana.id);
  await registrarAuditoria(user, "convocatoria.abrir", `Semana ${fechaLunes.toISOString().slice(0, 10)}`);

  revalidatePath("/convocatorias");
  redirect(`/convocatorias/${semana.id}`);
}

export async function sincronizarConvocatoriaAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !puedeConvocar(user.rol)) throw new Error("No tienes permiso sobre las convocatorias.");
  const semanaId = String(formData.get("semanaId") ?? "");
  const semana = await prisma.semanaServicio.findUnique({ where: { id: semanaId } });
  if (!semana) throw new Error("Semana no encontrada.");
  const n = await sincronizarRespuestas(semanaId);
  await registrarAuditoria(user, "convocatoria.sincronizar", `${n} voluntarios agregados`);
  revalidatePath(`/convocatorias/${semanaId}`);
}

export async function alternarConvocatoriaAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !puedeConvocar(user.rol)) throw new Error("No tienes permiso sobre las convocatorias.");
  const semanaId = String(formData.get("semanaId") ?? "");
  const semana = await prisma.semanaServicio.findUnique({ where: { id: semanaId } });
  if (!semana) throw new Error("Semana no encontrada.");
  await prisma.semanaServicio.update({
    where: { id: semanaId },
    data: { abierta: !semana.abierta },
  });
  await registrarAuditoria(
    user,
    semana.abierta ? "convocatoria.cerrar" : "convocatoria.reabrir",
    semana.fechaLunes.toISOString().slice(0, 10)
  );
  revalidatePath(`/convocatorias/${semanaId}`);
  revalidatePath("/convocatorias");
}

const respuestaSchema = z.object({
  token: z.string().min(1),
  disponibleJueves: z.enum(["si", "no"]).optional(),
  disponibleDomingoAM: z.enum(["si", "no"]).optional(),
  disponibleDomingoPM: z.enum(["si", "no"]).optional(),
});

export async function responderConvocatoriaAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = respuestaSchema.safeParse({
    token: formData.get("token"),
    disponibleJueves: formData.get("disponibleJueves") ?? undefined,
    disponibleDomingoAM: formData.get("disponibleDomingoAM") ?? undefined,
    disponibleDomingoPM: formData.get("disponibleDomingoPM") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "No se pudo procesar el formulario." };
  }

  const { token, ...resto } = parsed.data;
  const respuesta = await prisma.respuesta.findUnique({
    where: { token },
    include: { semana: { select: { abierta: true } } },
  });
  if (!respuesta) {
    return { error: "Este link no es válido." };
  }
  if (!respuesta.semana.abierta) {
    return { error: "Esta convocatoria ya está cerrada." };
  }

  await prisma.respuesta.update({
    where: { token },
    data: {
      disponibleJueves: resto.disponibleJueves === "si",
      disponibleDomingoAM: resto.disponibleDomingoAM === "si",
      disponibleDomingoPM: resto.disponibleDomingoPM === "si",
      respondidoAt: new Date(),
    },
  });

  revalidatePath(`/convocatorias/${respuesta.semanaId}`);
  redirect(`/confirmar/${token}?ok=1`);
}
