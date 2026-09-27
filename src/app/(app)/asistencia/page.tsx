import Link from "next/link";
import FormAccion from "@/components/FormAccion";
import QRCode from "qrcode";
import { CheckCircle2, Circle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ENCUENTROS, formatoFecha, hoySantiago, sumarDias } from "@/lib/conexion";
import { CLAVE_FRANJA, ORDEN_ENCUENTROS } from "@/lib/distribucion-datos";
import { encuentrosDelDia } from "@/lib/semana";
import { enlaceLlegada } from "@/lib/reunion";
import { origenSitio } from "@/lib/origen";
import { puedeArmarTodo } from "@/lib/distribucion-permisos";
import { alternarAsistenciaAction } from "@/lib/asistencia-actions";
import AutoRefresh from "../convocatorias/en-vivo/AutoRefresh";
import CopyLinkButton from "../convocatorias/[id]/CopyLinkButton";

export default async function AsistenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; e?: string }>;
}) {
  const { semana: semanaParam, e } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;

  const semanas = await prisma.semanaServicio.findMany({ orderBy: { fechaLunes: "desc" }, take: 8 });
  if (!semanas.length) {
    return <p className="text-sm text-slate-500">Aún no hay convocatorias.</p>;
  }
  const { fecha: hoy } = hoySantiago();
  const semanaDeHoy = semanas.find((s) => encuentrosDelDia(s.fechaLunes, hoy).length > 0);
  const semana = semanas.find((s) => s.id === semanaParam) ?? semanaDeHoy ?? semanas.find((s) => s.abierta) ?? semanas[0];
  const deHoy = encuentrosDelDia(semana.fechaLunes, hoy);
  const encuentro = ORDEN_ENCUENTROS.includes(e as "JUEVES") ? (e as string) : (deHoy[0] ?? "JUEVES");
  const enc = ENCUENTROS.find((x) => x.value === encuentro)!;

  const [asignaciones, disponibles, llegadas, editable, origen] = await Promise.all([
    prisma.asignacionPuesto.findMany({
      where: { semanaId: semana.id, encuentro },
      include: {
        voluntario: { select: { id: true, nombre: true } },
        puesto: { select: { nombre: true, orden: true, area: { select: { nombre: true, orden: true } } } },
      },
    }),
    prisma.respuesta.findMany({
      where: { semanaId: semana.id, [CLAVE_FRANJA[encuentro]]: true, voluntario: { activo: true } },
      include: { voluntario: { select: { id: true, nombre: true } } },
    }),
    prisma.asistencia.findMany({ where: { semanaId: semana.id, encuentro } }),
    puedeArmarTodo(user),
    origenSitio(),
  ]);

  const llego = new Set(llegadas.map((l) => l.voluntarioId));
  const asignados = new Set(asignaciones.map((a) => a.voluntarioId));
  const porArea = new Map<string, { orden: number; filas: { id: string; nombre: string; puesto: string }[] }>();
  for (const a of asignaciones.sort((x, y) => x.puesto.orden - y.puesto.orden)) {
    const k = a.puesto.area.nombre;
    if (!porArea.has(k)) porArea.set(k, { orden: a.puesto.area.orden, filas: [] });
    porArea.get(k)!.filas.push({ id: a.voluntarioId, nombre: a.voluntario.nombre, puesto: a.puesto.nombre });
  }
  const areas = [...porArea.entries()].sort((a, b) => a[1].orden - b[1].orden);
  const extra = disponibles
    .filter((r) => !asignados.has(r.voluntarioId))
    .map((r) => r.voluntario)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const llegaronAsignados = [...asignados].filter((id) => llego.has(id)).length;
  const llegaronExtra = extra.filter((v) => llego.has(v.id)).length;

  const enlace = enlaceLlegada(origen, semana.id, encuentro);
  const qr = await QRCode.toDataURL(enlace, { margin: 1, width: 320, color: { dark: "#1d1d1b", light: "#ffffff" } });
  const pct = asignados.size ? Math.round((llegaronAsignados / asignados.size) * 100) : 0;

  const Fila = ({ id, nombre, detalle }: { id: string; nombre: string; detalle?: string }) => {
    const si = llego.has(id);
    const contenido = (
      <>
        {si ? <CheckCircle2 className="h-5 w-5 shrink-0 text-sage-600" /> : <Circle className="h-5 w-5 shrink-0 text-slate-300" />}
        <span className="min-w-0 flex-1 text-left">
          <span className={`block truncate text-sm ${si ? "font-semibold text-slate-900" : "text-slate-600"}`}>{nombre}</span>
          {detalle && <span className="block truncate text-xs text-slate-400">{detalle}</span>}
        </span>
      </>
    );
    const clase = `flex w-full items-center gap-3 rounded-lg border px-3 py-2 ${si ? "border-sage-500/30 bg-sage-500/10" : "border-slate-200 bg-white"}`;
    return editable ? (
      <FormAccion action={alternarAsistenciaAction} exito="Llegada actualizada.">
        <input type="hidden" name="semanaId" value={semana.id} />
        <input type="hidden" name="encuentro" value={encuentro} />
        <input type="hidden" name="voluntarioId" value={id} />
        <button title={si ? "Quitar llegada" : "Marcar llegada"} className={`${clase} hover:border-brand-400`}>
          {contenido}
        </button>
      </FormAccion>
    ) : (
      <div className={clase}>{contenido}</div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">Llegada de voluntarios</h1>
          <p className="text-sm text-slate-500">
            {enc.largo} · {formatoFecha(sumarDias(semana.fechaLunes, enc.diaOffset))}. Pon el QR en la entrada: cada voluntario marca su llegada con su celular.
          </p>
        </div>
        <AutoRefresh cadaMs={5000} />
      </div>

      <div className="flex flex-wrap gap-2">
        {ENCUENTROS.map((x) => (
          <Link
            key={x.value}
            href={`/asistencia?semana=${semana.id}&e=${x.value}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              x.value === encuentro ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {x.largo}
            {deHoy.includes(x.value) && <span className="ml-2 rounded-full bg-accent-300 px-1.5 text-[10px] font-bold text-brand-900">HOY</span>}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR de registro de llegada" className="mx-auto h-52 w-52" />
          <p className="mt-2 text-sm font-semibold text-slate-900">Escanea al llegar</p>
          <p className="text-xs text-slate-500">Solo funciona el día del encuentro.</p>
          <div className="mt-3 flex justify-center gap-2">
            <CopyLinkButton url={enlace} />
          </div>
        </div>
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-end justify-between">
              <p className="text-sm text-slate-500">Llegaron de los asignados</p>
              <p className="text-5xl font-bold text-slate-900">
                {llegaronAsignados}
                <span className="text-2xl font-normal text-slate-400"> / {asignados.size}</span>
              </p>
            </div>
            <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-100">
              <div className="h-4 rounded-full bg-sage-500 transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {llegaronExtra > 0 && `+${llegaronExtra} disponibles sin puesto también llegaron. `}
              {asignados.size === 0 && "Aún no hay distribución para este encuentro."}
            </p>
          </div>
          {!editable && (
            <p className="text-xs text-slate-500">Solo quienes arman la distribución pueden marcar llegadas a mano.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {areas.map(([area, { filas }]) => (
          <div key={area} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="mb-2 flex items-center justify-between text-sm font-bold uppercase tracking-wide text-slate-700">
              {area}
              <span className="text-xs font-normal normal-case text-slate-500">
                {filas.filter((f) => llego.has(f.id)).length}/{filas.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filas.map((f) => (
                <Fila key={f.id} id={f.id} nombre={f.nombre} detalle={f.puesto} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {extra.length > 0 && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">Disponibles sin puesto</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {extra.map((v) => (
              <Fila key={v.id} id={v.id} nombre={v.nombre} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
