import Link from "next/link";
import { CalendarCheck, HeartHandshake, Layers, Users, UsersRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  contarRespuestas,
  contarVoluntariosMultiEquipo,
  equiposVisiblesPara,
  ultimaSemana,
} from "@/lib/queries";
import { FRANJAS, esAdmin, etiquetaRol, puedeConvocar, veTodo } from "@/lib/constants";
import { crearConvocatoriaAction } from "@/lib/actions";
import { Suspense } from "react";
import ResumenPastoral from "./ResumenPastoral";
import Cumpleanos from "./_panel/Cumpleanos";
import AlertasPastorales from "./_panel/AlertasPastorales";
import PendientesEquipo from "./_panel/PendientesEquipo";

const Esqueleto = ({ alto }: { alto: string }) => <div className={`${alto} animate-pulse rounded-xl bg-slate-200/70`} />;

function formatFecha(d: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

const COLORES_FRANJA = [
  "from-brand-600 to-brand-800",
  "from-accent-400 to-accent-500",
  "from-brand-400 to-brand-500",
];

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [equipos, totalVoluntarios, multiEquipo, semana, bienvenidasPendientes] = await Promise.all([
    equiposVisiblesPara(user),
    prisma.voluntario.count({
      where: veTodo(user.rol)
        ? { activo: true }
        : { activo: true, equipos: { some: { equipoId: { in: user.equipoIds } } } },
    }),
    veTodo(user.rol) ? contarVoluntariosMultiEquipo() : Promise.resolve(null),
    ultimaSemana(),
    prisma.postulacion.count({
      where: {
        estado: "INTEGRADA",
        bienvenidaAt: null,
        ...(esAdmin(user.rol) ? {} : { equipoAsignadoId: { in: user.equipoIds } }),
      },
    }),
  ]);

  let conteoSemana = null;
  if (semana) {
    const respuestas = await prisma.respuesta.findMany({
      where: {
        semanaId: semana.id,
        voluntario: veTodo(user.rol)
          ? undefined
          : { equipos: { some: { equipoId: { in: user.equipoIds } } } },
      },
      select: { disponibleJueves: true, disponibleDomingoAM: true, disponibleDomingoPM: true },
    });
    conteoSemana = contarRespuestas(respuestas);
  }

  const stats = [
    { n: equipos.length, t: "Equipos", icono: Layers, color: "from-brand-600 to-brand-800" },
    { n: totalVoluntarios, t: "Voluntarios activos", icono: Users, color: "from-sage-500 to-sage-700" },
    ...(multiEquipo !== null
      ? [{ n: multiEquipo, t: "En 2+ equipos", icono: UsersRound, color: "from-accent-400 to-accent-500" }]
      : []),
  ];

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-accent-300/25" />
        <p className="relative text-sm font-medium text-brand-100">{etiquetaRol(user.rol)}</p>
        <h1 className="relative mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          ¡Hola, {user.nombre.split(" ")[0]}!
        </h1>
        <p className="relative mt-1 max-w-xl text-sm text-brand-100">
          Este es el resumen de tu equipo de voluntariado. Que tengas un gran día sirviendo.
        </p>
      </div>

      {bienvenidasPendientes > 0 && (
        <Link
          href="/bienvenidas"
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm hover:bg-amber-100"
        >
          <HeartHandshake className="h-5 w-5 shrink-0 text-amber-600" />
          <span>
            Tienes <strong>{bienvenidasPendientes}</strong>{" "}
            {bienvenidasPendientes === 1 ? "voluntario nuevo" : "voluntarios nuevos"} pendientes de bienvenida.
            Contáctalos y dáselas →
          </span>
        </Link>
      )}

      {!veTodo(user.rol) && (
        <Suspense fallback={<Esqueleto alto="h-32" />}>
          <PendientesEquipo equipoIds={user.equipoIds} />
        </Suspense>
      )}

      <div className={`grid grid-cols-1 gap-4 ${stats.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {stats.map(({ n, t, icono: Icono, color }) => (
          <div
            key={t}
            className={`flex items-center justify-between rounded-2xl bg-gradient-to-br ${color} p-5 text-white shadow-md`}
          >
            <div>
              <p className="text-3xl font-bold">{n}</p>
              <p className="text-sm text-white/85">{t}</p>
            </div>
            <Icono className="h-10 w-10 text-white/40" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-200 text-brand-700">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <h2 className="font-semibold text-slate-900">Convocatoria de la semana</h2>
          </div>
          {puedeConvocar(user.rol) && (
            <form action={crearConvocatoriaAction}>
              <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                Abrir convocatoria próxima semana
              </button>
            </form>
          )}
        </div>

        {!semana && (
          <p className="text-sm text-slate-500">Todavía no se ha abierto ninguna convocatoria.</p>
        )}

        {semana && conteoSemana && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Semana del <strong>{formatFecha(semana.fechaLunes)}</strong> ·{" "}
              {(() => {
                const c0 = conteoSemana![FRANJAS[0].key];
                const total = c0.disponible + c0.noDisponible + c0.pendiente;
                return (
                  <>
                    <strong>{total - c0.pendiente}</strong> de {total} ya respondieron
                  </>
                );
              })()}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {FRANJAS.map((f, i) => {
                const c = conteoSemana![f.key];
                const total = c.disponible + c.noDisponible + c.pendiente;
                const pct = total ? Math.round((c.disponible / total) * 100) : 0;
                return (
                  <div key={f.key} className="overflow-hidden rounded-xl border border-slate-200">
                    <div className={`bg-gradient-to-r ${COLORES_FRANJA[i]} px-4 py-2 text-sm font-semibold text-white`}>
                      {f.label}
                    </div>
                    <div className="p-4">
                      <p className="text-3xl font-bold text-slate-900">
                        {c.disponible}{" "}
                        <span className="text-sm font-normal text-slate-500">disponibles</span>
                      </p>
                      <div className="mt-2 h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-sage-500" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {c.noDisponible} no disponibles · {c.pendiente} sin responder
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Link
              href={`/convocatorias/${semana.id}`}
              className="inline-block text-sm font-medium text-brand-700 underline underline-offset-2"
            >
              Ver detalle por equipo →
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Suspense fallback={<Esqueleto alto="h-64" />}>
          <Cumpleanos alcance={veTodo(user.rol) ? null : user.equipoIds} />
        </Suspense>
        <div className="lg:col-span-2">
          <Suspense fallback={<Esqueleto alto="h-64" />}>
            <AlertasPastorales alcance={veTodo(user.rol) ? null : user.equipoIds} />
          </Suspense>
        </div>
      </div>

      {user.rol === "PASTOR_CAMPUS" || user.rol === "ADMIN" ? (
        <Suspense fallback={<Esqueleto alto="h-96" />}>
          <ResumenPastoral equipos={equipos} />
        </Suspense>
      ) : null}
    </div>
  );
}
