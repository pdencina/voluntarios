import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { alternarActivoVoluntarioAction } from "@/lib/gestion";
import { puedeEditar, veTodo } from "@/lib/constants";

function formatFecha(d: Date | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export default async function VoluntarioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = decodeURIComponent((await params).id);
  const user = await getCurrentUser();
  if (!user) return null;

  const voluntario = await prisma.voluntario.findUnique({
    where: { id },
    include: { equipos: { include: { equipo: true } } },
  });
  if (!voluntario) notFound();

  const puedeVer =
    veTodo(user.rol) ||
    voluntario.equipos.some((ve) => user.equipoIds.includes(ve.equipoId));
  if (!puedeVer) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/voluntarios" className="text-sm text-slate-500 hover:underline">
          ← Voluntarios
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">{voluntario.nombre}</h1>
          {puedeEditar(user.rol) && (
          <div className="flex gap-2">
            <Link
              href={`/voluntarios/${encodeURIComponent(voluntario.id)}/editar`}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Editar
            </Link>
            <form action={alternarActivoVoluntarioAction}>
              <input type="hidden" name="id" value={voluntario.id} />
              <button className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
                {voluntario.activo ? "Desactivar" : "Reactivar"}
              </button>
            </form>
          </div>
          )}
        </div>
        {!voluntario.activo && (
          <p className="mt-2 rounded bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
            Voluntario inactivo: no recibe convocatorias nuevas.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-slate-400">Teléfono</dt>
            <dd className="text-sm text-slate-800">{voluntario.telefono || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-400">Correo</dt>
            <dd className="text-sm text-slate-800">{voluntario.correo || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-400">Fecha de nacimiento</dt>
            <dd className="text-sm text-slate-800">
              {formatFecha(voluntario.fechaNacimiento) || voluntario.fechaNacimientoRaw || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-400">Género</dt>
            <dd className="text-sm text-slate-800">
              {voluntario.genero === "F" ? "Mujer" : voluntario.genero === "M" ? "Hombre" : "—"}
            </dd>
          </div>
          {voluntario.observaciones && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-slate-400">Observaciones</dt>
              <dd className="text-sm text-slate-800">{voluntario.observaciones}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Equipos</h2>
          {voluntario.equipos.length >= 2 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Está en {voluntario.equipos.length} equipos
            </span>
          )}
        </div>
        <ul className="space-y-2">
          {voluntario.equipos.map((ve) => (
            <li key={ve.equipoId}>
              <Link
                href={`/equipos/${ve.equipoId}`}
                className="text-sm font-medium text-slate-900 hover:underline"
              >
                {ve.equipo.nombre}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
