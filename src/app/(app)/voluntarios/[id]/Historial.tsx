import { History } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ENCUENTROS, formatoFecha, sumarDias } from "@/lib/conexion";
import { CLAVE_FRANJA } from "@/lib/distribucion-datos";

const fmtCorto = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", timeZone: "UTC" });

type Estado = "llego" | "asignado" | "disponible" | "no" | "sin";

const ESTILO: Record<Estado, { clase: string; texto: string }> = {
  llego: { clase: "bg-sage-600 text-white", texto: "Sirvió (llegada registrada)" },
  asignado: { clase: "bg-sage-500/40 text-sage-800", texto: "Tuvo puesto" },
  disponible: { clase: "bg-accent-200 text-brand-700", texto: "Disponible, sin puesto" },
  no: { clase: "bg-slate-200 text-slate-500", texto: "No disponible" },
  sin: { clase: "border border-dashed border-slate-300 text-slate-300", texto: "Sin responder" },
};

export default async function Historial({ voluntarioId }: { voluntarioId: string }) {
  const semanas = await prisma.semanaServicio.findMany({ orderBy: { fechaLunes: "desc" }, take: 8 });
  if (!semanas.length) return null;
  const ids = semanas.map((s) => s.id);

  const [respuestas, asignaciones, asistencias, ultima] = await Promise.all([
    prisma.respuesta.findMany({ where: { voluntarioId, semanaId: { in: ids } } }),
    prisma.asignacionPuesto.findMany({
      where: { voluntarioId, semanaId: { in: ids } },
      include: { puesto: { select: { nombre: true } } },
    }),
    prisma.asistencia.findMany({ where: { voluntarioId, semanaId: { in: ids } } }),
    prisma.asignacionPuesto.findFirst({
      where: { voluntarioId },
      orderBy: { semana: { fechaLunes: "desc" } },
      include: { puesto: { select: { nombre: true } }, semana: { select: { fechaLunes: true } } },
    }),
  ]);

  const convocadas = respuestas.length;
  const respondidas = respuestas.filter((r) => r.respondidoAt).length;
  const conteoPuestos = new Map<string, number>();
  for (const a of asignaciones) conteoPuestos.set(a.puesto.nombre, (conteoPuestos.get(a.puesto.nombre) ?? 0) + 1);
  const frecuentes = [...conteoPuestos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const estado = (semanaId: string, encuentro: string): Estado => {
    if (asistencias.some((a) => a.semanaId === semanaId && a.encuentro === encuentro)) return "llego";
    if (asignaciones.some((a) => a.semanaId === semanaId && a.encuentro === encuentro)) return "asignado";
    const r = respuestas.find((x) => x.semanaId === semanaId);
    if (!r || !r.respondidoAt) return "sin";
    return r[CLAVE_FRANJA[encuentro]] ? "disponible" : "no";
  };

  const ultimaEnc = ultima ? ENCUENTROS.find((e) => e.value === ultima.encuentro) : null;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-200 text-brand-700">
          <History className="h-5 w-5" />
        </span>
        <h2 className="font-semibold text-slate-900">Historial de servicio</h2>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <dt className="text-xs uppercase text-slate-400">Respondió</dt>
          <dd className="text-lg font-bold text-slate-900">
            {respondidas}/{convocadas}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-400">Encuentros con puesto</dt>
          <dd className="text-lg font-bold text-slate-900">{asignaciones.length}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-400">Llegadas registradas</dt>
          <dd className="text-lg font-bold text-slate-900">{asistencias.length}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-400">Última vez</dt>
          <dd className="text-sm font-semibold text-slate-900">
            {ultima && ultimaEnc
              ? `${formatoFecha(sumarDias(ultima.semana.fechaLunes, ultimaEnc.diaOffset))} · ${ultima.puesto.nombre}`
              : "—"}
          </dd>
        </div>
      </dl>

      {frecuentes.length > 0 && (
        <p className="mt-3 text-sm text-slate-600">
          Puestos frecuentes: {frecuentes.map(([p, n]) => `${p} (${n})`).join(", ")}
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="text-xs">
          <thead>
            <tr>
              <th className="pr-3 text-left font-normal text-slate-400">Encuentro</th>
              {[...semanas].reverse().map((s) => (
                <th key={s.id} className="px-1 font-normal text-slate-400">
                  {fmtCorto.format(s.fechaLunes)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ENCUENTROS.map((e) => (
              <tr key={e.value}>
                <td className="whitespace-nowrap py-0.5 pr-3 text-slate-600">{e.largo}</td>
                {[...semanas].reverse().map((s) => {
                  const est = estado(s.id, e.value);
                  return (
                    <td key={s.id} className="px-1 py-0.5">
                      <span title={ESTILO[est].texto} className={`block h-5 w-8 rounded ${ESTILO[est].clase}`} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
        {(Object.keys(ESTILO) as Estado[]).map((k) => (
          <span key={k} className="flex items-center gap-1">
            <span className={`inline-block h-3 w-4 rounded ${ESTILO[k].clase}`} /> {ESTILO[k].texto}
          </span>
        ))}
      </div>
    </div>
  );
}
