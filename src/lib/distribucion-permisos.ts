import "server-only";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth";
import { esAdmin } from "@/lib/constants";

/** Líder de voluntarios (equipo rotativo), Administrador de campus, Admin o Pastor: arman toda la planilla. */
export async function puedeArmarTodo(user: CurrentUser): Promise<boolean> {
  if (esAdmin(user.rol) || user.rol === "ADMIN_CAMPUS") return true;
  if (!user.equipoIds.length) return false;
  return (await prisma.equipo.count({ where: { id: { in: user.equipoIds }, tipo: "ROTATIVO" } })) > 0;
}

export async function puedeEditarArea(user: CurrentUser, area: { equipoId: string | null }): Promise<boolean> {
  if (await puedeArmarTodo(user)) return true;
  return !!area.equipoId && user.equipoIds.includes(area.equipoId);
}
