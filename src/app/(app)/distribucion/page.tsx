import Link from "next/link";
import BotonConfirmar from "@/components/BotonConfirmar";
import { Download, Printer, Settings2, Sparkles, Trash2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { esAdmin } from "@/lib/constants";
import { ENCUENTROS, formatoFecha, sumarDias } from "@/lib/conexion";
import { cargarPlanilla, ORDEN_ENCUENTROS } from "@/lib/distribucion-datos";
import { motivosDe } from "@/lib/distribucion";
import { generarDistribucionAction, limpiarDistribucionAction } from "@/lib/distribucion-actions";
import { puedeArmarTodo } from "@/lib/distribucion-permisos";
import PlanillaEditor, { type AreaVM, type Candidato } from "./PlanillaEditor";
import CabeceraPlanilla from "./CabeceraPlanilla";

const COLORES = ["bg-sage-600", "bg-accent-500", "bg-brand-600", "bg-sage-700", "bg-accent-400", "bg-brand-500"];

export default async function DistribucionPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; e?: string }>;
}) {
  const { semana: semanaParam, e } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;

  const semanas = await prisma.semanaServicio.findMany({ orderBy: { fechaLunes: "desc" }, take: 8 });
  if (semanas.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-brand-900">Distribución de voluntarios</h1>
        <p className="mt-2 text-sm text-slate-500">
          Primero abre una convocatoria semanal para saber quién está disponible en cada encuentro.
        </p>
        <Link href="/convocatorias" className="mt-4 inline-block text-sm font-medium text-brand-700 underline">
          Ir a Convocatorias →
        </Link>
      </div>
    );
  }
  const semanaSel = semanas.find((s) => s.id === semanaParam) ?? semanas.find((s) => s.abierta) ?? semanas[0];
  const encuentro = ORDEN_ENCUENTROS.includes(e as "JUEVES") ? (e as string) : "JUEVES";

  const datos = await cargarPlanilla(semanaSel.id);
  if (!datos) return null;

  const armarTodo = await puedeArmarTodo(user);
  const puestosAlg = datos.puestosPorEncuentro(encuentro);
  const algPorId = new Map(puestosAlg.map((p) => [p.id, p]));
  const otros = datos.otrosDe(encuentro);
  const volPorId = new Map(datos.vols.map((v) => [v.id, v]));
  const delEncuentro = datos.asignaciones.filter((a) => a.encuentro === encuentro);
  const porSlot = new Map(delEncuentro.map((a) => [`${a.puestoId}:${a.slot}`, a]));
  const disponibles = datos.disponibles(encuentro);

  const areas: AreaVM[] = datos.areas
    .map((a, i) => {
      const editableArea = armarTodo || (!!a.equipoId && user.equipoIds.includes(a.equipoId));
      return {
        id: a.id,
        nombre: a.nombre,
        encargado: datos.encargadoDe(a.id, encuentro),
        encargadoEditable: editableArea,
        color: COLORES[i % COLORES.length],
        puestos: a.puestos
          .filter((p) => algPorId.has(p.id))
          .map((p) => {
            const alg = algPorId.get(p.id)!;
            return {
              id: p.id,
              nombre: p.nombre,
              cupos: p.cupos,
              genero: p.genero,
              rota: p.rota,
              elegibles: alg.elegibleEquipoIds,
              general: alg.general,
              editable: editableArea || (!!p.equipoId && user.equipoIds.includes(p.equipoId)),
              slots: Array.from({ length: p.cupos }, (_, slot) => {
                const asg = porSlot.get(`${p.id}:${slot}`);
                const v = asg ? volPorId.get(asg.voluntarioId) : null;
                return {
                  slot,
                  voluntarioId: asg?.voluntarioId ?? null,
                  nombre: v?.nombre ?? null,
                  fija: asg?.fija ?? false,
                  motivos: v ? motivosDe(v, alg, otros) : [],
                };
              }),
            };
          }),
      };
    })
    .filter((a) => a.puestos.length > 0);

  const asignadoEn = new Map(
    delEncuentro.map((a) => [a.voluntarioId, datos.areas.flatMap((ar) => ar.puestos).find((p) => p.id === a.puestoId)?.nombre ?? ""])
  );
  const candidatos: Candidato[] = disponibles
    .map((v) => ({ id: v.id, nombre: v.nombre, equipoIds: v.equipoIds, genero: v.genero, enPuesto: asignadoEn.get(v.id) ?? null }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const totalCupos = areas.reduce((s, a) => s + a.puestos.reduce((t, p) => t + p.cupos, 0), 0);
  const cubiertos = areas.reduce((s, a) => s + a.puestos.reduce((t, p) => t + p.slots.filter((x) => x.nombre).length, 0), 0);
  const sinPuesto = disponibles.filter((v) => !asignadoEn.has(v.id));
  const repiten = areas.flatMap((a) => a.puestos.flatMap((p) => p.slots.filter((s) => s.motivos.some((m) => m.startsWith("⚠")))));
  const faltan = areas
    .map((a) => ({
      area: a.nombre,
      n: a.puestos.reduce((t, p) => t + p.slots.filter((x) => !x.nombre).length, 0),
    }))
    .filter((x) => x.n > 0);

  const q = (extra: string) => `/distribucion?semana=${semanaSel.id}${extra}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">Distribución de voluntarios</h1>
          <p className="text-sm text-slate-500">
            Semana del {formatoFecha(semanaSel.fechaLunes)}. Se arma con quienes confirmaron disponibilidad y rota los puestos entre encuentros.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <form className="flex items-center gap-2">
            <input type="hidden" name="e" value={encuentro} />
            <select
              name="semana"
              defaultValue={semanaSel.id}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              {semanas.map((s) => (
                <option key={s.id} value={s.id}>
                  Semana del {formatoFecha(s.fechaLunes)}
                </option>
              ))}
            </select>
            <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50">Ver</button>
          </form>
          {esAdmin(user.rol) && (
            <Link
              href="/distribucion/plantilla"
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              <Settings2 className="h-4 w-4" /> Plantilla
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ENCUENTROS.map((en) => (
          <Link
            key={en.value}
            href={q(`&e=${en.value}`)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              en.value === encuentro ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {en.largo}
            <span className="ml-2 text-xs opacity-70">
              {formatoFecha(sumarDias(semanaSel.fechaLunes, en.diaOffset))}
            </span>
          </Link>
        ))}
      </div>

      <CabeceraPlanilla
        semanaId={semanaSel.id}
        fecha={formatoFecha(sumarDias(semanaSel.fechaLunes, ENCUENTROS.find((x) => x.value === encuentro)!.diaOffset))}
        horario={ENCUENTROS.find((x) => x.value === encuentro)!.hora}
        pastores={datos.cabecera.pastores}
        administradoresCampus={datos.cabecera.administradoresCampus}
        lideresVoluntarios={datos.cabecera.lideresVoluntarios}
        editable={armarTodo}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">
            {cubiertos}
            <span className="text-base font-normal text-slate-400"> / {totalCupos}</span>
          </p>
          <p className="text-xs text-slate-500">puestos cubiertos</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-sage-700">{disponibles.length}</p>
          <p className="text-xs text-slate-500">voluntarios disponibles</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{sinPuesto.length}</p>
          <p className="text-xs text-slate-500">disponibles sin puesto</p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm ${repiten.length ? "border-amber-200 bg-amber-50" : "border-slate-200/80 bg-white"}`}>
          <p className="text-2xl font-bold text-slate-900">{repiten.length}</p>
          <p className="text-xs text-slate-500">repiten puesto de otro encuentro</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {armarTodo && (
          <>
            <form action={generarDistribucionAction}>
              <input type="hidden" name="semanaId" value={semanaSel.id} />
              <input type="hidden" name="encuentro" value={encuentro} />
              <button className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                <Sparkles className="h-4 w-4 text-accent-300" /> Generar propuesta de este encuentro
              </button>
            </form>
            <form action={generarDistribucionAction}>
              <input type="hidden" name="semanaId" value={semanaSel.id} />
              <input type="hidden" name="encuentro" value="TODOS" />
              <button className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                Generar los 3 encuentros
              </button>
            </form>
            <form action={limpiarDistribucionAction}>
              <input type="hidden" name="semanaId" value={semanaSel.id} />
              <input type="hidden" name="encuentro" value={encuentro} />
              <BotonConfirmar
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                titulo="¿Limpiar la propuesta de este encuentro?"
                mensaje="Se quitan las asignaciones automáticas. Las que pusiste a mano (con candado) se mantienen."
                textoConfirmar="Limpiar"
                peligro={false}
              >
                <Trash2 className="h-4 w-4" /> Limpiar automáticas
              </BotonConfirmar>
            </form>
          </>
        )}
        <Link
          href={`/distribucion/imprimir?semana=${semanaSel.id}&e=${encuentro}`}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <Printer className="h-4 w-4" /> Vista para imprimir
        </Link>
        <a
          href={`/api/distribucion?semana=${semanaSel.id}`}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" /> Descargar Excel
        </a>
      </div>

      {(faltan.length > 0 || sinPuesto.length > 0 || repiten.length > 0) && cubiertos > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="mb-1 font-semibold">Para revisar</p>
          <ul className="list-inside list-disc space-y-0.5">
            {faltan.map((f) => (
              <li key={f.area}>
                {f.area}: {f.n} {f.n === 1 ? "cupo vacío" : "cupos vacíos"}
              </li>
            ))}
            {repiten.length > 0 && <li>{repiten.length} persona(s) repiten puesto porque no había otra alternativa (marcadas en ámbar).</li>}
            {sinPuesto.length > 0 && (
              <li>
                Disponibles sin puesto: {sinPuesto.slice(0, 12).map((v) => v.nombre).join(", ")}
                {sinPuesto.length > 12 ? `… (+${sinPuesto.length - 12})` : ""}
              </li>
            )}
          </ul>
        </div>
      )}

      {cubiertos === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          {armarTodo
            ? "Aún no hay distribución para este encuentro. Pulsa “Generar propuesta” y luego ajústala a mano si quieres."
            : "Aún no hay distribución para este encuentro."}
        </div>
      )}

      <PlanillaEditor areas={areas} candidatos={candidatos} semanaId={semanaSel.id} encuentro={encuentro} />

      <p className="text-xs text-slate-500">
        Toca un nombre o un cupo vacío para cambiarlo a mano (queda con candado y la propuesta automática no lo toca). En ámbar: repite puesto. Pasa el mouse sobre un nombre para ver por qué quedó ahí.
      </p>
    </div>
  );
}
