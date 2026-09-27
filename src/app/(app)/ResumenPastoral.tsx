import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ESTADOS_POSTULACION, FRANJAS, TIPO_EQUIPO } from "@/lib/constants";
import { ENCUENTROS, ORIGENES, resumenSemana, sumarDias } from "@/lib/conexion";
import { lunesDeSemana } from "@/lib/logica";

const fmtSemana = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

type Equipo = { id: string; nombre: string; tipo: string; _count: { voluntarios: number } };

export default async function ResumenPastoral({ equipos }: { equipos: Equipo[] }) {
  const lunesActual = lunesDeSemana(new Date().toISOString().slice(0, 10))!;
  const desde = sumarDias(lunesActual, -7 * 7);
  const [semanas, postulaciones, bienvenidasPendientes, nuevas] = await Promise.all([
    prisma.semanaServicio.findMany({
      orderBy: { fechaLunes: "desc" },
      take: 8,
      include: {
        respuestas: {
          select: {
            disponibleJueves: true,
            disponibleDomingoAM: true,
            disponibleDomingoPM: true,
            voluntario: { select: { activo: true, equipos: { select: { equipoId: true } } } },
          },
        },
      },
    }),
    prisma.postulacion.groupBy({ by: ["estado"], _count: { _all: true } }),
    prisma.postulacion.count({ where: { estado: "INTEGRADA", bienvenidaAt: null } }),
    prisma.personaNueva.findMany({
      where: {
        OR: [
          { fechaLlegada: { gte: desde } },
          { paso1At: { gte: desde } },
          { paso2At: { gte: desde } },
        ],
      },
    }),
  ]);
  const semanasConexion = Array.from({ length: 8 }, (_, i) => sumarDias(lunesActual, -7 * i)).map((l) =>
    resumenSemana(nuevas, l)
  );

  // ----- Equilibrio de voluntarios por equipo -----
  const grupos = [
    { titulo: "Ministerios", lista: equipos.filter((e) => e.tipo === TIPO_EQUIPO.MINISTERIO) },
    { titulo: "Equipos rotativos", lista: equipos.filter((e) => e.tipo === TIPO_EQUIPO.ROTATIVO) },
  ].map((g) => {
    const ordenada = [...g.lista].sort((a, b) => b._count.voluntarios - a._count.voluntarios);
    const total = ordenada.reduce((s, e) => s + e._count.voluntarios, 0);
    return {
      ...g,
      ordenada,
      total,
      promedio: ordenada.length ? total / ordenada.length : 0,
      max: ordenada[0]?._count.voluntarios ?? 0,
    };
  });

  // ----- Participación por encuentro (semanas más recientes) -----
  const semanasCalc = semanas.map((s) => {
    const activas = s.respuestas.filter((r) => r.voluntario.activo);
    const respondieron = activas.filter((r) => r.disponibleJueves !== null).length;
    return {
      id: s.id,
      fechaLunes: s.fechaLunes,
      convocados: activas.length,
      respondieron,
      franjas: FRANJAS.map((f) => activas.filter((r) => r[f.key] === true).length),
    };
  });
  const semanaActual = semanas[0];
  const porEquipo = new Map<string, number[]>();
  if (semanaActual) {
    for (const r of semanaActual.respuestas) {
      if (!r.voluntario.activo) continue;
      for (const { equipoId } of r.voluntario.equipos) {
        const fila = porEquipo.get(equipoId) ?? [0, 0, 0];
        FRANJAS.forEach((f, i) => {
          if (r[f.key] === true) fila[i]++;
        });
        porEquipo.set(equipoId, fila);
      }
    }
  }
  const promedios = FRANJAS.map((_, i) => {
    const conDatos = semanasCalc.filter((s) => s.respondieron > 0);
    return conDatos.length
      ? Math.round(conDatos.reduce((sum, s) => sum + s.franjas[i], 0) / conDatos.length)
      : 0;
  });

  const porEstado = Object.fromEntries(postulaciones.map((p) => [p.estado, p._count._all]));

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Resumen pastoral</h2>
        <p className="text-sm text-slate-500">
          Equilibrio del voluntariado, participación por encuentro y nuevas personas.
        </p>
      </div>

      {/* Equilibrio */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {grupos.map((g) => (
          <div key={g.titulo} className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="font-semibold text-slate-900">{g.titulo}</h3>
              <span className="text-xs text-slate-500">
                {g.total} voluntarios · promedio {g.promedio.toFixed(1)} por equipo
              </span>
            </div>
            <ul className="space-y-1.5">
              {g.ordenada.map((e, i) => {
                const n = e._count.voluntarios;
                const esMax = i === 0 && g.ordenada.length > 1;
                const esMin = i === g.ordenada.length - 1 && g.ordenada.length > 1;
                return (
                  <li key={e.id} className="flex items-center gap-3 text-sm">
                    <Link href={`/equipos/${e.id}`} className="w-40 shrink-0 truncate text-slate-700 hover:underline">
                      {e.nombre}
                    </Link>
                    <div className="h-3 flex-1 rounded bg-slate-100">
                      <div
                        className={`h-3 rounded ${esMax ? "bg-sage-500" : esMin ? "bg-amber-500" : "bg-brand-400"}`}
                        style={{ width: `${g.max ? (n / g.max) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-8 text-right tabular-nums text-slate-900">{n}</span>
                    <span className="w-14 text-xs">
                      {esMax && <span className="text-emerald-700">más</span>}
                      {esMin && <span className="text-amber-700">menos</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Participación por encuentro */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
        <div className="mb-3">
          <h3 className="font-semibold text-slate-900">Voluntarios confirmados por encuentro</h3>
          <p className="text-xs text-slate-500">
            Basado en las confirmaciones de disponibilidad de cada convocatoria semanal.
          </p>
        </div>
        {semanasCalc.length === 0 ? (
          <p className="text-sm text-slate-400">Aún no hay convocatorias.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Semana del</th>
                  {FRANJAS.map((f) => (
                    <th key={f.key} className="py-2 pr-4">
                      {f.label}
                    </th>
                  ))}
                  <th className="py-2 pr-4">Respondieron</th>
                </tr>
              </thead>
              <tbody>
                {semanasCalc.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4">
                      <Link href={`/convocatorias/${s.id}`} className="font-medium text-slate-900 hover:underline">
                        {fmtSemana.format(s.fechaLunes)}
                      </Link>
                    </td>
                    {s.franjas.map((n, i) => (
                      <td key={i} className="py-2 pr-4 tabular-nums text-slate-800">
                        {n}
                      </td>
                    ))}
                    <td className="py-2 pr-4 text-slate-500">
                      {s.respondieron}/{s.convocados}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-medium">
                  <td className="py-2 pr-4 text-slate-600">Promedio</td>
                  {promedios.map((n, i) => (
                    <td key={i} className="py-2 pr-4 tabular-nums text-slate-900">
                      {n}
                    </td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Última semana por equipo */}
      {semanaActual && (
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
          <h3 className="mb-3 font-semibold text-slate-900">
            Última convocatoria por equipo{" "}
            <span className="text-xs font-normal text-slate-500">
              (semana del {fmtSemana.format(semanaActual.fechaLunes)})
            </span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Equipo</th>
                  <th className="py-2 pr-4">Voluntarios</th>
                  {FRANJAS.map((f) => (
                    <th key={f.key} className="py-2 pr-4">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...equipos]
                  .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
                  .map((e) => {
                    const fila = porEquipo.get(e.id) ?? [0, 0, 0];
                    return (
                      <tr key={e.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-4 text-slate-900">{e.nombre}</td>
                        <td className="py-2 pr-4 tabular-nums text-slate-500">{e._count.voluntarios}</td>
                        {fila.map((n, i) => (
                          <td key={i} className="py-2 pr-4 tabular-nums text-slate-800">
                            {n}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conexión: personas nuevas */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Personas nuevas en el campus (Conexión)</h3>
            <p className="text-xs text-slate-500">Registradas por el equipo de Conexión, últimas 8 semanas.</p>
          </div>
          <Link href="/conexion/reporte" className="text-sm text-slate-600 underline underline-offset-2">
            Ver reporte →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-4">Semana del</th>
                {ENCUENTROS.map((e) => (
                  <th key={e.value} className="py-2 pr-4">
                    {e.label}
                  </th>
                ))}
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">{ORIGENES[0].label}</th>
                <th className="py-2 pr-4">{ORIGENES[1].label}</th>
                <th className="py-2 pr-4">Paso 1</th>
                <th className="py-2">Paso 2</th>
              </tr>
            </thead>
            <tbody>
              {semanasConexion.map((s) => (
                <tr key={s.lunes.toISOString()} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-4 font-medium text-slate-900">{fmtSemana.format(s.lunes)}</td>
                  {s.encuentros.map((e) => (
                    <td key={e.encuentro} className="py-2 pr-4 tabular-nums text-slate-700">
                      {e.total}
                    </td>
                  ))}
                  <td className="py-2 pr-4 font-medium tabular-nums text-slate-900">{s.total}</td>
                  <td className="py-2 pr-4 tabular-nums text-slate-700">{s.porOrigen.RRSS}</td>
                  <td className="py-2 pr-4 tabular-nums text-slate-700">{s.porOrigen.AMIGOS_FAMILIA}</td>
                  <td className="py-2 pr-4 tabular-nums text-slate-700">{s.paso1}</td>
                  <td className="py-2 tabular-nums text-slate-700">{s.paso2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ingreso al voluntariado */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Ingreso al voluntariado</h3>
          <Link href="/ingreso-voluntariado" className="text-sm text-slate-600 underline underline-offset-2">
            Ver ingresos →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.entries(ESTADOS_POSTULACION).map(([k, v]) => (
            <div key={k} className="rounded border border-slate-200 p-3">
              <p className="text-2xl font-semibold text-slate-900">{porEstado[k] ?? 0}</p>
              <p className="text-xs text-slate-500">{v.label}</p>
            </div>
          ))}
          <Link href="/bienvenidas" className="rounded border border-sky-200 bg-sky-50 p-3">
            <p className="text-2xl font-semibold text-sky-900">{bienvenidasPendientes}</p>
            <p className="text-xs text-sky-700">Bienvenidas por hacer</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
