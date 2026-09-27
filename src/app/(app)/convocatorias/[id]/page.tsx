import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { equiposVisiblesPara, voluntariosPorEquipo } from "@/lib/queries";
import { FRANJAS, puedeConvocar } from "@/lib/constants";
import { enlaceWhatsApp } from "@/lib/logica";
import { sincronizarConvocatoriaAction, alternarConvocatoriaAction } from "@/lib/actions";
import CopyLinkButton from "./CopyLinkButton";

function formatFecha(d: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

async function baseUrl() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

function Barra({ valor, total, color = "bg-sage-500" }: { valor: number; total: number; color?: string }) {
  const pct = total ? Math.round((valor / total) * 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-slate-100">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function ConvocatoriaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pendientes?: string }>;
}) {
  const { id } = await params;
  const { pendientes } = await searchParams;
  const soloPendientes = pendientes === "1";
  const user = await getCurrentUser();
  if (!user) return null;

  const semana = await prisma.semanaServicio.findUnique({ where: { id } });
  if (!semana) notFound();

  const equipos = await equiposVisiblesPara(user);
  const origin = await baseUrl();

  const porEquipo = await voluntariosPorEquipo(equipos.map((e) => e.id), semana.id);
  const equiposConDatos = equipos.map((equipo) => {
      const voluntarios = porEquipo.get(equipo.id) ?? [];
      const filas = voluntarios.map((v) => ({
        id: v.id,
        nombre: v.nombre,
        telefono: v.telefono,
        respuesta: v.respuestas[0] ?? null,
        respondio: !!v.respuestas[0]?.respondidoAt,
      }));
      return {
        equipo,
        filas,
        total: filas.length,
        respondieron: filas.filter((f) => f.respondio).length,
        disponibles: FRANJAS.map((fr) => filas.filter((f) => f.respuesta?.[fr.key] === true).length),
      };
    });

  // Resumen general sin contar dos veces a quien está en varios equipos.
  const unicos = new Map<string, (typeof equiposConDatos)[number]["filas"][number]>();
  for (const e of equiposConDatos) for (const f of e.filas) unicos.set(f.id, f);
  const todos = [...unicos.values()];
  const totalConvocados = todos.length;
  const totalRespondieron = todos.filter((f) => f.respondio).length;
  const totalDisponibles = FRANJAS.map((fr) => todos.filter((f) => f.respuesta?.[fr.key] === true).length);

  const q = (extra: string) => `/convocatorias/${semana.id}${extra}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/convocatorias" className="text-sm text-slate-500 hover:underline">
          ← Convocatorias
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">
            Semana del {formatFecha(semana.fechaLunes)}
            {!semana.abierta && (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-sm font-normal text-slate-500">Cerrada</span>
            )}
          </h1>
          {puedeConvocar(user.rol) && (
            <div className="flex gap-2">
              <form action={sincronizarConvocatoriaAction}>
                <input type="hidden" name="semanaId" value={semana.id} />
                <button className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
                  Incluir voluntarios nuevos
                </button>
              </form>
              <form action={alternarConvocatoriaAction}>
                <input type="hidden" name="semanaId" value={semana.id} />
                <button className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
                  {semana.abierta ? "Cerrar convocatoria" : "Reabrir"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Resumen de la convocatoria */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <p className="text-sm text-slate-500">Han respondido</p>
            <p className="text-3xl font-bold text-slate-900">
              {totalRespondieron}
              <span className="text-lg font-normal text-slate-400"> / {totalConvocados}</span>
            </p>
            <div className="mt-2">
              <Barra valor={totalRespondieron} total={totalConvocados} color="bg-brand-600" />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {totalConvocados - totalRespondieron} pendientes de responder
            </p>
          </div>
          {FRANJAS.map((f, i) => (
            <div key={f.key}>
              <p className="text-sm text-slate-500">{f.label}</p>
              <p className="text-3xl font-bold text-sage-700">
                {totalDisponibles[i]}
                <span className="text-sm font-normal text-slate-500"> disponibles</span>
              </p>
              <div className="mt-2">
                <Barra valor={totalDisponibles[i]} total={totalConvocados} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Ve quién ya respondió y recuérdaselo por WhatsApp a quien falta.
        </p>
        <div className="flex gap-2 text-sm">
          <Link
            href={q("")}
            className={`rounded-full border px-3 py-1 ${!soloPendientes ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 text-slate-600"}`}
          >
            Todos
          </Link>
          <Link
            href={q("?pendientes=1")}
            className={`rounded-full border px-3 py-1 ${soloPendientes ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 text-slate-600"}`}
          >
            Solo pendientes ({totalConvocados - totalRespondieron})
          </Link>
        </div>
      </div>

      {equiposConDatos.map(({ equipo, filas, total, respondieron, disponibles }) => {
        const visibles = soloPendientes ? filas.filter((f) => !f.respondio) : filas;
        if (soloPendientes && visibles.length === 0) return null;
        return (
          <div key={equipo.id} className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-48 flex-1">
                <h2 className="font-semibold text-slate-900">
                  {equipo.nombre}
                  {semana.abierta && (
                    <Link
                      href={`/convocatorias/en-vivo?equipo=${equipo.id}`}
                      className="ml-3 rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-medium text-white hover:bg-brand-700"
                    >
                      Modo reunión
                    </Link>
                  )}
                </h2>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="w-40">
                    <Barra valor={respondieron} total={total} color="bg-brand-600" />
                  </div>
                  <span className="text-xs text-slate-500">
                    {respondieron} de {total} respondieron
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                {FRANJAS.map((f, i) => (
                  <span key={f.key} className="rounded-full bg-sage-500/10 px-2.5 py-1 text-sage-700">
                    <strong>{disponibles[i]}</strong> {f.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Voluntario</th>
                    {FRANJAS.map((f) => (
                      <th key={f.key} className="py-2 pr-4">
                        {f.label}
                      </th>
                    ))}
                    <th className="py-2 pr-4">Estado</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((v) => {
                    const link = v.respuesta ? `${origin}/confirmar/${v.respuesta.token}` : null;
                    const recordatorio =
                      !v.respondio && link
                        ? enlaceWhatsApp(
                            v.telefono,
                            `Hola ${v.nombre.split(" ")[0]}, ¿puedes confirmar tu disponibilidad para la semana de servicio del ${formatFecha(semana.fechaLunes)}? Solo toma un minuto: ${link}`
                          )
                        : null;
                    return (
                      <tr key={v.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-4 font-medium text-slate-900">{v.nombre}</td>
                        {FRANJAS.map((f) => {
                          const val = v.respuesta ? v.respuesta[f.key] : null;
                          return (
                            <td key={f.key} className="py-2 pr-4">
                              {val === true && <span className="font-bold text-sage-600">✓</span>}
                              {val === false && <span className="text-red-500">✕</span>}
                              {val === null && <span className="text-slate-300">·</span>}
                            </td>
                          );
                        })}
                        <td className="py-2 pr-4">
                          {v.respondio ? (
                            <span className="rounded-full bg-sage-500/10 px-2 py-0.5 text-xs font-medium text-sage-700">
                              Respondió
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-4 text-right">
                          {recordatorio && (
                            <a
                              href={recordatorio}
                              target="_blank"
                              rel="noreferrer"
                              className="mr-2 text-xs font-medium text-sage-700 hover:underline"
                            >
                              Recordar por WhatsApp
                            </a>
                          )}
                          {link && <CopyLinkButton url={link} />}
                        </td>
                      </tr>
                    );
                  })}
                  {visibles.length === 0 && (
                    <tr>
                      <td colSpan={FRANJAS.length + 3} className="py-4 text-center text-slate-400">
                        Sin voluntarios en este equipo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
