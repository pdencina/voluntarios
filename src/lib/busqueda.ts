"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { veTodo } from "@/lib/constants";
import { normalizarNombre } from "@/lib/normalize";

export type ResultadoBusqueda = { tipo: "voluntario" | "equipo"; id: string; titulo: string; detalle: string; href: string };

/** Búsqueda del buscador global (Ctrl+K), limitada a lo que el usuario puede ver. */
export async function buscarGlobalAction(consulta: string): Promise<ResultadoBusqueda[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const q = normalizarNombre(consulta);
  if (q.length < 2) return [];
  const todo = veTodo(user.rol);

  const [voluntarios, equipos] = await Promise.all([
    prisma.voluntario.findMany({
      where: {
        nombreNormalizado: { contains: q },
        ...(todo ? {} : { equipos: { some: { equipoId: { in: user.equipoIds } } } }),
      },
      take: 8,
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, activo: true, equipos: { select: { equipo: { select: { nombre: true } } } } },
    }),
    prisma.equipo.findMany({
      where: {
        nombre: { contains: consulta.trim(), mode: "insensitive" },
        ...(todo ? {} : { id: { in: user.equipoIds } }),
      },
      take: 4,
      select: { id: true, nombre: true, liderNombre: true },
    }),
  ]);

  return [
    ...voluntarios.map((v) => ({
      tipo: "voluntario" as const,
      id: v.id,
      titulo: v.nombre,
      detalle: [v.equipos.map((e) => e.equipo.nombre).join(", "), v.activo ? "" : "inactivo"].filter(Boolean).join(" · "),
      href: `/voluntarios/${encodeURIComponent(v.id)}`,
    })),
    ...equipos.map((e) => ({
      tipo: "equipo" as const,
      id: e.id,
      titulo: e.nombre,
      detalle: e.liderNombre ? `Líder: ${e.liderNombre}` : "Equipo",
      href: `/equipos/${e.id}`,
    })),
  ];
}
