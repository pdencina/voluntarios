import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ENCUENTROS, formatoFecha, sumarDias } from "@/lib/conexion";
import { cargarPlanilla, ORDEN_ENCUENTROS } from "@/lib/distribucion-datos";
import BotonImprimir from "./BotonImprimir";

const PASTELES = ["#c6e0b4", "#cfe2f3", "#fce5cd", "#d9d2e9", "#fff2cc", "#d0e0e3", "#f4cccc", "#d9ead3"];

export default async function ImprimirPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; e?: string }>;
}) {
  const { semana: semanaParam, e } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;

  const semana =
    (semanaParam && (await prisma.semanaServicio.findUnique({ where: { id: semanaParam } }))) ||
    (await prisma.semanaServicio.findFirst({ orderBy: { fechaLunes: "desc" } }));
  if (!semana) return <p className="text-sm text-slate-500">No hay convocatorias.</p>;
  const datos = await cargarPlanilla(semana.id);
  if (!datos) return null;

  const encuentro = ORDEN_ENCUENTROS.includes(e as "JUEVES") ? (e as string) : "JUEVES";
  const enc = ENCUENTROS.find((x) => x.value === encuentro)!;
  const ids = new Set(datos.puestosPorEncuentro(encuentro).map((p) => p.id));
  const volPorId = new Map(datos.vols.map((v) => [v.id, v.nombre]));
  const porSlot = new Map(
    datos.asignaciones.filter((a) => a.encuentro === encuentro).map((a) => [`${a.puestoId}:${a.slot}`, a.voluntarioId])
  );
  const areas = datos.areas.filter((a) => a.puestos.some((p) => ids.has(p.id)));
  const borde = "border border-black";

  return (
    <div className="mx-auto max-w-5xl bg-white text-black print:max-w-none">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/distribucion?semana=${semana.id}&e=${encuentro}`} className="text-sm text-slate-500 hover:underline">
          ← Volver a la distribución
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {ENCUENTROS.map((x) => (
            <Link
              key={x.value}
              href={`/distribucion/imprimir?semana=${semana.id}&e=${x.value}`}
              className={`rounded-full border px-3 py-1 text-sm ${x.value === encuentro ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 text-slate-700"}`}
            >
              {x.largo}
            </Link>
          ))}
          <BotonImprimir />
        </div>
      </div>

      <div className={`${borde} bg-neutral-100`}>
        <div className="flex items-start justify-between px-5 pb-2 pt-4">
          <div>
            <h1 className="text-2xl font-extrabold uppercase leading-tight">Voluntarios Campus Puente Alto</h1>
            <p className="text-sm">Campus Puente Alto</p>
          </div>
          <p className="text-3xl leading-none tracking-tight">
            <span className="font-light">arm</span>
            <span className="font-extrabold">global</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 bg-white px-5 py-2 text-sm">
          <div className="space-y-1">
            <div className="flex gap-3"><b className="w-52 text-right">Fecha:</b><span className="font-bold">{formatoFecha(sumarDias(semana.fechaLunes, enc.diaOffset))}</span></div>
            <div className="flex gap-3"><b className="w-52 text-right">Pastores:</b><span>{datos.cabecera.pastores}</span></div>
            <div className="flex gap-3"><b className="w-52 text-right">Administradores de Campus:</b><span>{datos.cabecera.administradoresCampus}</span></div>
          </div>
          <div className="space-y-1">
            <div className="flex gap-3"><b className="w-40 text-right">Horario:</b><span>{enc.hora}</span></div>
            <div className="flex gap-3"><b className="w-40 text-right">Líderes de Voluntarios:</b><span>{datos.cabecera.lideresVoluntarios}</span></div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {areas.map((a, i) => {
          const puestos = a.puestos.filter((p) => ids.has(p.id));
          const cols = Math.max(...puestos.map((p) => p.cupos));
          return (
            <table key={a.id} className={`${borde} w-full border-collapse text-sm [break-inside:avoid]`}>
              <thead>
                <tr>
                  <th colSpan={cols + 1} className={`${borde} py-1 text-center font-bold uppercase`} style={{ background: PASTELES[i % PASTELES.length] }}>
                    {a.nombre}
                  </th>
                </tr>
                <tr>
                  <td className={`${borde} px-2 py-1 font-bold`} style={{ background: PASTELES[i % PASTELES.length] }}>
                    ENCARGADO DE ÁREA:
                  </td>
                  <td colSpan={cols} className={`${borde} px-2 py-1 text-center font-bold`}>
                    {datos.encargadoDe(a.id, encuentro) ?? ""}
                  </td>
                </tr>
              </thead>
              <tbody>
                {puestos.map((p) => (
                  <tr key={p.id}>
                    <td className={`${borde} w-1/3 px-2 py-1 font-bold`} style={{ background: PASTELES[i % PASTELES.length] }}>
                      {p.nombre}
                    </td>
                    {Array.from({ length: cols }, (_, slot) => {
                      const vid = slot < p.cupos ? porSlot.get(`${p.id}:${slot}`) : undefined;
                      return (
                        <td key={slot} className={`${borde} px-2 py-1 text-center`}>
                          {vid ? (volPorId.get(vid) ?? "") : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })}
      </div>
    </div>
  );
}
