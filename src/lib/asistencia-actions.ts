"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";
import { hoySantiago } from "@/lib/conexion";
import { encuentrosDelDia } from "@/lib/semana";
import { firmaLlegadaValida } from "@/lib/reunion";
import { puedeArmarTodo } from "@/lib/distribucion-permisos";
import type { ActionState } from "@/lib/actions";

function refrescar(semanaId: string) {
  revalidatePath("/asistencia");
  revalidatePath("/distribucion");
  revalidatePath(`/convocatorias/${semanaId}`);
}

async function registrar(semanaId: string, encuentro: string, voluntarioId: string, registradaPorId: string | null) {
  await prisma.asistencia.upsert({
    where: { semanaId_encuentro_voluntarioId: { semanaId, encuentro, voluntarioId } },
    update: {},
    create: { semanaId, encuentro, voluntarioId, registradaPorId },
  });
}

/** El voluntario marca su llegada desde su link personal (solo el día del encuentro). */
export async function marcarMiLlegadaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const encuentro = String(formData.get("encuentro") ?? "");
  const r = await prisma.respuesta.findUnique({ where: { token }, include: { semana: true } });
  if (!r) return { error: "Este link no es válido." };
  if (!encuentrosDelDia(r.semana.fechaLunes, hoySantiago().fecha).includes(encuentro)) {
    return { error: "El registro de llegada se habilita el día del encuentro." };
  }
  await registrar(r.semanaId, encuentro, r.voluntarioId, null);
  refrescar(r.semanaId);
  return { ok: "¡Llegada registrada! Gracias por servir hoy." };
}

/** Desde el QR de la entrada: el voluntario busca su nombre y marca que llegó. */
export async function registrarLlegadaQRAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const semanaId = String(formData.get("semanaId") ?? "");
  const encuentro = String(formData.get("encuentro") ?? "");
  const firma = String(formData.get("f") ?? "");
  const voluntarioId = String(formData.get("voluntarioId") ?? "");
  if (!firmaLlegadaValida(semanaId, encuentro, firma)) return { error: "Este código no es válido." };

  const [semana, vol] = await Promise.all([
    prisma.semanaServicio.findUnique({ where: { id: semanaId } }),
    prisma.voluntario.findUnique({ where: { id: voluntarioId }, select: { nombre: true, activo: true } }),
  ]);
  if (!semana) return { error: "Convocatoria no encontrada." };
  if (!vol?.activo) return { error: "Voluntario no encontrado." };
  if (!encuentrosDelDia(semana.fechaLunes, hoySantiago().fecha).includes(encuentro)) {
    return { error: "El registro de llegada se habilita el día del encuentro." };
  }
  await registrar(semanaId, encuentro, voluntarioId, null);
  refrescar(semanaId);
  return { ok: `¡Gracias por servir hoy, ${vol.nombre.split(" ")[0]}!` };
}

/** Líderes: marcar o desmarcar la llegada a mano (por ejemplo, quien no trae celular). */
export async function alternarAsistenciaAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !(await puedeArmarTodo(user))) throw new Error("Sin permiso.");
  const semanaId = String(formData.get("semanaId") ?? "");
  const encuentro = String(formData.get("encuentro") ?? "");
  const voluntarioId = String(formData.get("voluntarioId") ?? "");

  const existe = await prisma.asistencia.findUnique({
    where: { semanaId_encuentro_voluntarioId: { semanaId, encuentro, voluntarioId } },
  });
  if (existe) {
    await prisma.asistencia.delete({ where: { id: existe.id } });
  } else {
    await registrar(semanaId, encuentro, voluntarioId, user.id);
  }
  await registrarAuditoria(user, existe ? "asistencia.quitar" : "asistencia.marcar", `${voluntarioId} (${encuentro})`);
  refrescar(semanaId);
}
