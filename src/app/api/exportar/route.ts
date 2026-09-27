import { getCurrentUser } from "@/lib/auth";
import { esAdmin } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

function csv(valor: unknown): string {
  const s = valor === null || valor === undefined ? "" : String(valor);
  const seguro = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${seguro.replace(/"/g, '""')}"`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !esAdmin(user.rol)) {
    return new Response("No autorizado", { status: 403 });
  }

  const voluntarios = await prisma.voluntario.findMany({
    orderBy: { nombre: "asc" },
    include: { equipos: { include: { equipo: { select: { nombre: true } } } } },
  });

  const filas = [
    ["Nombre", "Teléfono", "Correo", "Nacimiento", "Activo", "Equipos", "Observaciones"],
    ...voluntarios.map((v) => [
      v.nombre,
      v.telefono,
      v.correo,
      v.fechaNacimiento?.toISOString().slice(0, 10) ?? v.fechaNacimientoRaw,
      v.activo ? "sí" : "no",
      v.equipos.map((e) => e.equipo.nombre).join(" | "),
      v.observaciones,
    ]),
  ];

  const cuerpo = "\uFEFF" + filas.map((f) => f.map(csv).join(",")).join("\r\n");
  return new Response(cuerpo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="voluntarios-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
