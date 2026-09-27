import Link from "next/link";
import BotonConfirmar from "@/components/BotonConfirmar";
import { esAdmin } from "@/lib/constants";
import { notFound } from "next/navigation";
import { getCurrentUser, puedeVerEquipo } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eliminarEquipoAction } from "@/lib/gestion";

function formatFecha(d: Date | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export default async function EquipoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  if (!puedeVerEquipo(user, id)) {
    notFound();
  }

  const equipo = await prisma.equipo.findUnique({
    where: { id },
    include: {
      voluntarios: {
        where: { voluntario: { activo: true } },
        include: {
          voluntario: { include: { _count: { select: { equipos: true } } } },
        },
      },
    },
  });
  if (!equipo) notFound();

  const roster = equipo.voluntarios
    .map((ve) => ve.voluntario)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/equipos" className="text-sm text-slate-500 hover:underline">
          ← Equipos
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">{equipo.nombre}</h1>
          {esAdmin(user.rol) && (
            <div className="flex gap-2">
              <Link
                href={`/equipos/${equipo.id}/editar`}
                className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                Editar
              </Link>
              {roster.length === 0 && (
                <form action={eliminarEquipoAction}>
                  <input type="hidden" name="id" value={equipo.id} />
                  <BotonConfirmar
                    className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                    titulo={`¿Eliminar el equipo “${equipo.nombre}”?`}
                    mensaje="El equipo no tiene voluntarios. Se quitará también de los usuarios que lo tenían asignado."
                  >
                    Eliminar
                  </BotonConfirmar>
                </form>
              )}
            </div>
          )}
        </div>
        <p className="text-sm text-slate-500">
          Líder: {equipo.liderNombre || "Sin líder asignado"} · {roster.length} voluntario
          {roster.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-brand-50 text-xs uppercase text-brand-700">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Teléfono</th>
              <th className="px-4 py-2">Correo</th>
              <th className="px-4 py-2">Nacimiento</th>
              <th className="px-4 py-2">Equipos</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((v) => (
              <tr key={v.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2">
                  <Link href={`/voluntarios/${v.id}`} className="font-medium text-slate-900 hover:underline">
                    {v.nombre}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{v.telefono || "—"}</td>
                <td className="px-4 py-2 text-slate-600">{v.correo || "—"}</td>
                <td className="px-4 py-2 text-slate-600">
                  {formatFecha(v.fechaNacimiento) || v.fechaNacimientoRaw || "—"}
                </td>
                <td className="px-4 py-2">
                  {v._count.equipos >= 2 ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {v._count.equipos} equipos
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">1 equipo</span>
                  )}
                </td>
              </tr>
            ))}
            {roster.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Sin voluntarios registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
