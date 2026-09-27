import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeConexion } from "@/lib/conexion-acceso";
import {
  CATEGORIAS,
  ENCUENTROS,
  ESTADOS_PERSONA,
  ORIGENES,
  formatoFecha,
  hoySantiago,
  sumarDias,
} from "@/lib/conexion";
import { enlaceWhatsApp, lunesDeSemana } from "@/lib/logica";
import { avanzarPersonaAction } from "@/lib/conexion-actions";
import NuevaPersonaForm from "./NuevaPersonaForm";

const SIGUIENTE: Record<string, { estado: string; etiqueta: string } | undefined> = {
  NUEVA: { estado: "CONTACTADA", etiqueta: "Contactada" },
  CONTACTADA: { estado: "PASO_1", etiqueta: "Hizo paso 1" },
  PASO_1: { estado: "PASO_2", etiqueta: "Hizo paso 2" },
};

export default async function ConexionPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const { semana } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;
  if (!(await puedeConexion(user))) redirect("/");

  const { fecha: hoy, encuentroSugerido } = hoySantiago();
  const lunes = (semana && lunesDeSemana(semana)) || lunesDeSemana(hoy)!;
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const personas = await prisma.personaNueva.findMany({
    where: { fechaLlegada: { gte: lunes, lt: sumarDias(lunes, 7) } },
    orderBy: [{ fechaLlegada: "desc" }, { createdAt: "desc" }],
  });
  const sinSeguimiento = await prisma.personaNueva.count({
    where: { estado: "NUEVA", fechaLlegada: { lt: lunes } },
  });

  const etiqueta = (lista: readonly { value: string; label?: string; plural?: string }[], v: string) =>
    lista.find((x) => x.value === v)?.label ?? v;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">Conexión</h1>
          <p className="text-sm text-slate-500">
            Personas nuevas que llegan al campus: registro en el patio y seguimiento.
          </p>
        </div>
        <Link
          href={`/conexion/reporte?semana=${iso(lunes)}`}
          className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Reporte semanal
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Registrar persona nueva</h2>
        <NuevaPersonaForm hoy={hoy} encuentroSugerido={encuentroSugerido} atendidaPor={user.nombre} />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">
            Semana del {formatoFecha(lunes)} al {formatoFecha(sumarDias(lunes, 6))}{" "}
            <span className="text-sm font-normal text-slate-500">({personas.length} personas)</span>
          </h2>
          <div className="flex gap-2 text-sm">
            <Link
              href={`/conexion?semana=${iso(sumarDias(lunes, -7))}`}
              className="rounded border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
            >
              ← Anterior
            </Link>
            <Link
              href={`/conexion?semana=${iso(sumarDias(lunes, 7))}`}
              className="rounded border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
            >
              Siguiente →
            </Link>
          </div>
        </div>

        {sinSeguimiento > 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            Hay <strong>{sinSeguimiento}</strong> {sinSeguimiento === 1 ? "persona" : "personas"} de semanas
            anteriores que todavía no fueron contactadas.
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-brand-50 text-xs uppercase text-brand-700">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Encuentro</th>
                <th className="px-4 py-2">Persona</th>
                <th className="px-4 py-2">Llegó por</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {personas.map((p) => {
                const est = ESTADOS_PERSONA[p.estado as keyof typeof ESTADOS_PERSONA];
                const sig = SIGUIENTE[p.estado];
                const wa = enlaceWhatsApp(
                  p.telefono,
                  `¡Hola ${p.nombre.split(" ")[0]}! Te saluda el equipo de Conexión de la iglesia. Nos alegró mucho conocerte. ¿Cómo estás?`
                );
                return (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2">
                      <Link href={`/conexion/${p.id}`} className="font-medium text-slate-900 hover:underline">
                        {p.nombre}
                      </Link>
                      <span className="block text-xs text-slate-400">
                        {formatoFecha(p.fechaLlegada)} · {p.telefono ?? "sin teléfono"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{etiqueta(ENCUENTROS, p.encuentro)}</td>
                    <td className="px-4 py-2 text-slate-600">{etiqueta(CATEGORIAS, p.categoria)}</td>
                    <td className="px-4 py-2 text-slate-600">{etiqueta(ORIGENES, p.origen)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${est?.color}`}>
                        {est?.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          className="mr-2 text-xs font-medium text-emerald-700 hover:underline"
                        >
                          WhatsApp
                        </a>
                      )}
                      {sig && (
                        <form action={avanzarPersonaAction} className="inline">
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="estado" value={sig.estado} />
                          <button className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100">
                            {sig.etiqueta}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
              {personas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    Aún no hay personas registradas esta semana.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
