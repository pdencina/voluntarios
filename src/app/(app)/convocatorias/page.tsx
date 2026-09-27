import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { crearConvocatoriaAction } from "@/lib/actions";
import { puedeConvocar } from "@/lib/constants";

function formatFecha(d: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export default async function ConvocatoriasPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const semanas = await prisma.semanaServicio.findMany({
    orderBy: { fechaLunes: "desc" },
    include: { _count: { select: { respuestas: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">Convocatorias</h1>
          <p className="text-sm text-slate-500">
            Disponibilidad semanal para Jueves y Domingo (AM/PM).
          </p>
        </div>
        {puedeConvocar(user.rol) && (
          <form action={crearConvocatoriaAction} className="flex items-center gap-2">
            <input
              type="date"
              name="fecha"
              title="Cualquier día de la semana a convocar (vacío = próxima semana)"
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <button className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
              Abrir convocatoria
            </button>
          </form>
        )}
      </div>

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white shadow-sm">
        {semanas.map((s) => (
          <Link
            key={s.id}
            href={`/convocatorias/${s.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-brand-50/60"
          >
            <div>
              <p className="font-medium text-slate-900">
                Semana del {formatFecha(s.fechaLunes)}
                {!s.abierta && (
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Cerrada</span>
                )}
              </p>
              <p className="text-xs text-slate-400">{s._count.respuestas} voluntarios convocados</p>
            </div>
            <span className="text-sm text-slate-400">Ver detalle →</span>
          </Link>
        ))}
        {semanas.length === 0 && (
          <p className="px-4 py-6 text-center text-slate-400">
            Todavía no se ha abierto ninguna convocatoria.
          </p>
        )}
      </div>
    </div>
  );
}
