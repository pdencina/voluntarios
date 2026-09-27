import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ESTADOS_POSTULACION,
  TIEMPO_IGLESIA,
  esAdmin,
  puedePostular,
} from "@/lib/constants";

const fmt = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" });

export default async function PostulacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;
  if (!puedePostular(user.rol)) redirect("/");

  const admin = esAdmin(user.rol);
  const estadoValido = estado && estado in ESTADOS_POSTULACION ? estado : undefined;

  const [lista, conteos] = await Promise.all([
    prisma.postulacion.findMany({
      where: {
        ...(admin ? {} : { creadaPorId: user.id }),
        ...(estadoValido ? { estado: estadoValido } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { equipoInteres: { select: { nombre: true } } },
    }),
    prisma.postulacion.groupBy({
      by: ["estado"],
      where: admin ? {} : { creadaPorId: user.id },
      _count: { _all: true },
    }),
  ]);
  const porEstado = Object.fromEntries(conteos.map((c) => [c.estado, c._count._all]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">Ingreso Voluntariado</h1>
          <p className="text-sm text-slate-500">
            Personas que quieren sumarse como voluntarias: registro, decisión e integración a un equipo.
            {!admin && " Aquí ves los que tú registraste y su estado."}
          </p>
        </div>
        <Link
          href="/ingreso-voluntariado/nueva"
          className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Nuevo ingreso
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/ingreso-voluntariado"
          className={`rounded-full border px-3 py-1 ${!estadoValido ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 text-slate-600"}`}
        >
          Todas
        </Link>
        {Object.entries(ESTADOS_POSTULACION).map(([k, v]) => (
          <Link
            key={k}
            href={`/ingreso-voluntariado?estado=${k}`}
            className={`rounded-full border px-3 py-1 ${estadoValido === k ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 text-slate-600"}`}
          >
            {v.label} ({porEstado[k] ?? 0})
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-brand-50 text-xs uppercase text-brand-700">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Tiempo en la iglesia</th>
              <th className="px-4 py-2">Equipo de interés</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Registrado</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => {
              const est = ESTADOS_POSTULACION[p.estado as keyof typeof ESTADOS_POSTULACION];
              return (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2">
                    <Link href={`/ingreso-voluntariado/${p.id}`} className="font-medium text-slate-900 hover:underline">
                      {p.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {TIEMPO_IGLESIA.find((t) => t.value === p.tiempoIglesia)?.label}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{p.equipoInteres?.nombre ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${est?.color}`}>
                      {est?.label ?? p.estado}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">{fmt.format(p.createdAt)}</td>
                </tr>
              );
            })}
            {lista.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No hay ingresos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
