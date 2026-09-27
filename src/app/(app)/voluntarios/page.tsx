import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizarNombre } from "@/lib/normalize";
import { equiposVisiblesPara } from "@/lib/queries";
import { puedeEditar, veTodo } from "@/lib/constants";

export default async function VoluntariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; equipo?: string; multi?: string; inactivos?: string }>;
}) {
  const { q, equipo, multi, inactivos } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;

  const equiposFiltro = await equiposVisiblesPara(user);
  const verInactivos = inactivos === "1";

  const voluntarios = await prisma.voluntario.findMany({
    where: {
      activo: verInactivos ? false : true,
      ...(veTodo(user.rol)
        ? {}
        : { equipos: { some: { equipoId: { in: user.equipoIds } } } }),
      ...(equipo ? { equipos: { some: { equipoId: equipo } } } : {}),
    },
    include: {
      equipos: { include: { equipo: { select: { nombre: true } } } },
    },
    orderBy: { nombre: "asc" },
  });

  const query = q ? normalizarNombre(q) : "";
  let filtrados = query
    ? voluntarios.filter((v) => v.nombreNormalizado.includes(query))
    : voluntarios;
  if (multi === "1") filtrados = filtrados.filter((v) => v.equipos.length >= 2);

  const multiEquipo = filtrados.filter((v) => v.equipos.length >= 2);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">
            Voluntarios{verInactivos ? " inactivos" : ""}
          </h1>
          <p className="text-sm text-slate-500">
            {filtrados.length} voluntario{filtrados.length === 1 ? "" : "s"} ·{" "}
            <span className="text-amber-700">{multiEquipo.length} en 2+ equipos</span>
          </p>
        </div>
        {puedeEditar(user.rol) && (
          <Link
            href="/voluntarios/nuevo"
            className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Nuevo voluntario
          </Link>
        )}
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre…"
          className="w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          name="equipo"
          defaultValue={equipo ?? ""}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los equipos</option>
          {equiposFiltro.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" name="multi" value="1" defaultChecked={multi === "1"} />
          Solo en 2+ equipos
        </label>
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" name="inactivos" value="1" defaultChecked={verInactivos} />
          Inactivos
        </label>
        <button className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
          Filtrar
        </button>
      </form>

      <ul className="space-y-2 md:hidden">
        {filtrados.map((v) => (
          <li key={v.id} className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/voluntarios/${encodeURIComponent(v.id)}`} className="font-medium text-slate-900">
                {v.nombre}
              </Link>
              {v.equipos.length >= 2 && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {v.equipos.length} equipos
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{[v.telefono, v.correo].filter(Boolean).join(" · ") || "Sin contacto"}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {v.equipos.map((ve) => (
                <span key={ve.equipoId} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {ve.equipo.nombre}
                </span>
              ))}
            </div>
          </li>
        ))}
        {filtrados.length === 0 && <li className="py-6 text-center text-sm text-slate-400">Sin resultados.</li>}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-brand-50 text-xs uppercase text-brand-700">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Teléfono</th>
              <th className="px-4 py-2">Correo</th>
              <th className="px-4 py-2">Equipos</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((v) => (
              <tr key={v.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2">
                  <Link
                    href={`/voluntarios/${encodeURIComponent(v.id)}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {v.nombre}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-600">{v.telefono || "—"}</td>
                <td className="px-4 py-2 text-slate-600">{v.correo || "—"}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {v.equipos.map((ve) => (
                      <span
                        key={ve.equipoId}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                      >
                        {ve.equipo.nombre}
                      </span>
                    ))}
                    {v.equipos.length >= 2 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        ⚠ {v.equipos.length} equipos
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  {puedeEditar(user.rol) && (
                    <Link
                      href={`/voluntarios/${encodeURIComponent(v.id)}/editar`}
                      className="text-xs font-medium text-slate-600 hover:underline"
                    >
                      Editar
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
