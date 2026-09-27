import "server-only";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth";
import { esAdmin } from "@/lib/constants";

/** Equipos que el usuario puede asignar/quitar en un voluntario. */
export async function equiposGestionables(user: CurrentUser) {
  return prisma.equipo.findMany({
    where: esAdmin(user.rol) ? {} : { id: { in: user.equipoIds } },
    orderBy: [{ tipo: "asc" }, { nombre: "asc" }],
    select: { id: true, nombre: true },
  });
}
