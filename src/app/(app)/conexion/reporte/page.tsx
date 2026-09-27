import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { liderConexion, puedeConexion } from "@/lib/conexion-acceso";
import {
  CATEGORIAS,
  ENCUENTROS,
  ORIGENES,
  formatoFecha,
  hoySantiago,
  resumenSemana,
  sumarDias,
  textoReporte,
} from "@/lib/conexion";
import { lunesDeSemana } from "@/lib/logica";
import CopyTextButton from "../CopyTextButton";

export default async function ReporteConexionPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; campus?: string }>;
}) {
  const { semana, campus: campusParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;
  if (!(await puedeConexion(user))) redirect("/");

  const { fecha: hoy } = hoySantiago();
  // Los lunes se reporta la semana que terminó; el resto de la semana, la actual.
  const lunesHoy = lunesDeSemana(hoy)!;
  const porDefecto = hoy === lunesHoy.toISOString().slice(0, 10) ? sumarDias(lunesHoy, -7) : lunesHoy;
  const lunes = (semana && lunesDeSemana(semana)) || porDefecto;
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const [personas, lideres, campuses] = await Promise.all([
    prisma.personaNueva.findMany({
      where: {
        OR: [
          { fechaLlegada: { gte: lunes, lt: sumarDias(lunes, 7) } },
          { paso1At: { gte: lunes, lt: sumarDias(lunes, 7) } },
          { paso2At: { gte: lunes, lt: sumarDias(lunes, 7) } },
        ],
      },
    }),
    liderConexion(),
    prisma.personaNueva.findMany({ distinct: ["campus"], select: { campus: true } }),
  ]);
  const listaCampus = [...new Set(["CPA", ...campuses.map((c) => c.campus)])];
  const campus = campusParam && listaCampus.includes(campusParam) ? campusParam : listaCampus[0];
  const delCampus = personas.filter((p) => p.campus === campus);

  const resumen = resumenSemana(delCampus, lunes);
  const texto = textoReporte({ campus, lunes, personas: delCampus, lideres });
  const q = (l: Date, c = campus) => `/conexion/reporte?semana=${iso(l)}&campus=${encodeURIComponent(c)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/conexion" className="text-sm text-slate-500 hover:underline">
            ← Conexión
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900">Reporte semanal</h1>
          <p className="text-sm text-slate-500">
            Semana del {formatoFecha(lunes)} al {formatoFecha(sumarDias(lunes, 6))} · Campus {campus}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {listaCampus.length > 1 &&
            listaCampus.map((c) => (
              <Link
                key={c}
                href={q(lunes, c)}
                className={`rounded border px-3 py-1 ${c === campus ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 text-slate-700"}`}
              >
                {c}
              </Link>
            ))}
          <Link href={q(sumarDias(lunes, -7))} className="rounded border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100">
            ← Anterior
          </Link>
          <Link href={q(sumarDias(lunes, 7))} className="rounded border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100">
            Siguiente →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tarjeta n={resumen.total} t="Nuevos esta semana" />
        <Tarjeta n={resumen.paso1} t="Hicieron paso 1" />
        <Tarjeta n={resumen.paso2} t="Hicieron paso 2" />
        <Tarjeta
          n={resumen.total ? `${Math.round((resumen.paso1 / resumen.total) * 100)}%` : "—"}
          t="Paso 1 / nuevos"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Por encuentro</h2>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-3">Encuentro</th>
                {CATEGORIAS.map((c) => (
                  <th key={c.value} className="py-2 pr-3">
                    {c.plural}
                  </th>
                ))}
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {resumen.encuentros.map((e) => (
                <tr key={e.encuentro} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-3 text-slate-900">
                    {ENCUENTROS.find((x) => x.value === e.encuentro)?.label}
                    <span className="block text-xs text-slate-400">{formatoFecha(e.fecha)}</span>
                  </td>
                  {CATEGORIAS.map((c) => (
                    <td key={c.value} className="py-2 pr-3 tabular-nums text-slate-700">
                      {e.porCategoria[c.value]}
                    </td>
                  ))}
                  <td className="py-2 font-medium tabular-nums text-slate-900">{e.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-700">
            {ORIGENES.map((o) => (
              <span key={o.value}>
                {o.label}: <strong>{resumen.porOrigen[o.value]}</strong>
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Texto para enviar</h2>
            <CopyTextButton texto={texto} etiqueta="Copiar para WhatsApp" />
          </div>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-700">
            {texto}
          </pre>
        </div>
      </div>
    </div>
  );
}

function Tarjeta({ n, t }: { n: number | string; t: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-4">
      <p className="text-2xl font-semibold text-slate-900">{n}</p>
      <p className="text-sm text-slate-500">{t}</p>
    </div>
  );
}
