"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { firmaValida } from "@/lib/reunion";
import { getCurrentUser } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";
import { proximoLunes } from "@/lib/logica";
import type { ActionState } from "@/lib/actions";

const siNo = (v: FormDataEntryValue | null) => (v === "si" ? true : v === "no" ? false : null);

export async function responderEnReunionAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const semanaId = String(formData.get("semanaId") ?? "");
  const equipoId = String(formData.get("equipoId") ?? "");
  const firma = String(formData.get("f") ?? "");
  const voluntarioId = String(formData.get("voluntarioId") ?? "");
  if (!firmaValida(semanaId, equipoId, firma)) return { error: "Este link no es válido." };

  const jueves = siNo(formData.get("disponibleJueves"));
  const am = siNo(formData.get("disponibleDomingoAM"));
  const pm = siNo(formData.get("disponibleDomingoPM"));
  if (jueves === null || am === null || pm === null) {
    return { error: "Responde los tres encuentros." };
  }

  const [semana, membresia] = await Promise.all([
    prisma.semanaServicio.findUnique({ where: { id: semanaId } }),
    prisma.voluntarioEquipo.findUnique({
      where: { voluntarioId_equipoId: { voluntarioId, equipoId } },
      include: { voluntario: { select: { activo: true } } },
    }),
  ]);
  if (!semana) return { error: "Convocatoria no encontrada." };
  if (!semana.abierta) return { error: "Esta convocatoria ya está cerrada." };
  if (!membresia || !membresia.voluntario.activo) return { error: "No estás en la lista de este equipo." };

  await prisma.respuesta.upsert({
    where: { semanaId_voluntarioId: { semanaId, voluntarioId } },
    update: {
      disponibleJueves: jueves,
      disponibleDomingoAM: am,
      disponibleDomingoPM: pm,
      respondidoAt: new Date(),
    },
    create: {
      semanaId,
      voluntarioId,
      token: randomBytes(24).toString("hex"),
      disponibleJueves: jueves,
      disponibleDomingoAM: am,
      disponibleDomingoPM: pm,
      respondidoAt: new Date(),
    },
  });

  revalidatePath(`/convocatorias/${semanaId}`);
  revalidatePath("/convocatorias/en-vivo");
  redirect(`/reunion/${semanaId}/${equipoId}?f=${firma}&gracias=${encodeURIComponent(voluntarioId)}`);
}

/** Un líder (o cualquier rol con sesión) abre la convocatoria de la próxima semana para hacerla en su reunión. */
export async function abrirSemanaEnReunionAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesión expirada.");
  const equipoId = String(formData.get("equipo") ?? "");

  const fechaLunes = proximoLunes();
  const semana = await prisma.semanaServicio.upsert({
    where: { fechaLunes },
    update: { abierta: true },
    create: { fechaLunes, creadaPorId: user.id },
  });
  const [voluntarios, existentes] = await Promise.all([
    prisma.voluntario.findMany({ where: { activo: true }, select: { id: true } }),
    prisma.respuesta.findMany({ where: { semanaId: semana.id }, select: { voluntarioId: true } }),
  ]);
  const ya = new Set(existentes.map((e) => e.voluntarioId));
  const nuevos = voluntarios.filter((v) => !ya.has(v.id));
  if (nuevos.length) {
    await prisma.respuesta.createMany({
      data: nuevos.map((v) => ({
        semanaId: semana.id,
        voluntarioId: v.id,
        token: randomBytes(24).toString("hex"),
      })),
    });
  }
  await registrarAuditoria(user, "convocatoria.abrir_reunion", fechaLunes.toISOString().slice(0, 10));
  revalidatePath("/convocatorias");
  redirect(`/convocatorias/en-vivo${equipoId ? `?equipo=${encodeURIComponent(equipoId)}` : ""}`);
}
