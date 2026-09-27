import Link from "next/link";
import FormAccion from "@/components/FormAccion";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TIEMPO_IGLESIA, esAdmin } from "@/lib/constants";
import { enlaceWhatsApp } from "@/lib/logica";
import { marcarBienvenidaAction } from "@/lib/postulaciones";

const fmt = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeZone: "America/Santiago",
});

export default async function BienvenidasPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const alcance = esAdmin(user.rol) ? {} : { equipoAsignadoId: { in: user.equipoIds } };

  const [pendientes, hechas] = await Promise.all([
    prisma.postulacion.findMany({
      where: { estado: "INTEGRADA", bienvenidaAt: null, ...alcance },
      orderBy: { integradaAt: "asc" },
      include: { equipoAsignado: { select: { nombre: true } } },
    }),
    prisma.postulacion.findMany({
      where: { estado: "INTEGRADA", bienvenidaAt: { not: null }, ...alcance },
      orderBy: { bienvenidaAt: "desc" },
      take: 10,
      include: { equipoAsignado: { select: { nombre: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-900">Bienvenida de voluntarios</h1>
        <p className="text-sm text-slate-500">
          Voluntarios nuevos en tu equipo: contáctalos, súmalos al grupo de WhatsApp y dales la bienvenida.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-slate-900">Por dar la bienvenida ({pendientes.length})</h2>
        {pendientes.length === 0 && (
          <p className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-6 text-center text-slate-400">
            No hay bienvenidas pendientes.
          </p>
        )}
        {pendientes.map((p) => {
          const equipo = p.equipoAsignado?.nombre ?? "";
          const mensaje =
            `¡Hola ${p.nombre.split(" ")[0]}! Soy ${user.nombre}, del equipo ${equipo}. ` +
            `Nos alegra mucho que te sumes al voluntariado. Te voy a agregar al grupo de WhatsApp del equipo para coordinarnos. ¡Bienvenido/a!`;
          const enlace = enlaceWhatsApp(p.telefono, mensaje);
          return (
            <div key={p.id} className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{p.nombre}</p>
                  <p className="text-sm text-slate-500">
                    {equipo} · se integró el {p.integradaAt ? fmt.format(p.integradaAt) : "—"}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    Tel: {p.telefono ?? "—"}
                    {p.correo ? ` · ${p.correo}` : ""}
                  </p>
                  <p className="text-xs text-slate-400">
                    Tiempo en la iglesia: {TIEMPO_IGLESIA.find((t) => t.value === p.tiempoIglesia)?.label}
                    {p.recomendadoPor ? ` · recomendado/a por ${p.recomendadoPor}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {enlace && (
                    <a
                      href={enlace}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Escribir por WhatsApp
                    </a>
                  )}
                  <FormAccion action={marcarBienvenidaAction} exito="¡Bienvenida registrada!">
                    <input type="hidden" name="id" value={p.id} />
                    <button className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
                      Ya di la bienvenida
                    </button>
                  </FormAccion>
                </div>
              </div>
              {esAdmin(user.rol) && (
                <Link href={`/ingreso-voluntariado/${p.id}`} className="mt-2 inline-block text-xs text-slate-500 hover:underline">
                  Ver ingreso →
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {hechas.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-slate-900">Últimas bienvenidas realizadas</h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white shadow-sm text-sm">
            {hechas.map((p) => (
              <li key={p.id} className="flex justify-between px-4 py-2">
                <span className="text-slate-900">
                  {p.nombre} <span className="text-slate-400">· {p.equipoAsignado?.nombre}</span>
                </span>
                <span className="text-slate-500">{p.bienvenidaAt ? fmt.format(p.bienvenidaAt) : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
