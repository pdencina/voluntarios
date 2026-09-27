import "server-only";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth";

export async function registrarAuditoria(
  user: Pick<CurrentUser, "id" | "nombre"> | null,
  accion: string,
  detalle: string
) {
  await prisma.auditLog.create({
    data: {
      usuarioId: user?.id ?? null,
      usuarioNombre: user?.nombre ?? "Sistema",
      accion,
      detalle,
    },
  });
}
