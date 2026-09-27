import { redirect } from "next/navigation";
import { esAdmin } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nombresSimilares } from "@/lib/logica";
import FusionarPar from "./FusionarPar";

export default async function DuplicadosPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!esAdmin(user.rol)) redirect("/");

  const voluntarios = await prisma.voluntario.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    include: { equipos: { include: { equipo: { select: { nombre: true } } } } },
  });

  const detalle = (v: (typeof voluntarios)[number]) =>
    [v.equipos.map((e) => e.equipo.nombre).join(", "), v.telefono, v.correo]
      .filter(Boolean)
      .join(" · ");

  const pares: { a: (typeof voluntarios)[number]; b: (typeof voluntarios)[number] }[] = [];
  for (let i = 0; i < voluntarios.length; i++) {
    for (let j = i + 1; j < voluntarios.length; j++) {
      if (nombresSimilares(voluntarios[i].nombre, voluntarios[j].nombre)) {
        pares.push({ a: voluntarios[i], b: voluntarios[j] });
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-900">Posibles duplicados</h1>
        <p className="text-sm text-slate-500">
          Nombres muy parecidos. Si son la misma persona, fusiónalos; si no, ignóralos.
        </p>
      </div>
      {pares.length === 0 && (
        <p className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-6 text-center text-slate-400">
          No se detectaron posibles duplicados.
        </p>
      )}
      <div className="space-y-3">
        {pares.map(({ a, b }) => (
          <FusionarPar
            key={`${a.id}|${b.id}`}
            a={{ id: a.id, nombre: a.nombre, detalle: detalle(a) }}
            b={{ id: b.id, nombre: b.nombre, detalle: detalle(b) }}
          />
        ))}
      </div>
    </div>
  );
}
