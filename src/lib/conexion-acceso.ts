import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth";
import { esAdmin } from "@/lib/constants";

/** Administradores y personas asignadas al equipo "Conexión". */
export const puedeConexion = cache(async (user: CurrentUser): Promise<boolean> => {
  if (esAdmin(user.rol)) return true;
  if (user.equipoIds.length === 0) return false;
  const n = await prisma.equipo.count({
    where: { id: { in: user.equipoIds }, nombre: { equals: "Conexión", mode: "insensitive" } },
  });
  return n > 0;
});

export async function liderConexion(): Promise<string | null> {
  const eq = await prisma.equipo.findFirst({
    where: { nombre: { equals: "Conexión", mode: "insensitive" } },
    select: { liderNombre: true },
  });
  return eq?.liderNombre ?? null;
}
