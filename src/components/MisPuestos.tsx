import { MapPin } from "lucide-react";
import { ENCUENTROS, formatoFecha, sumarDias } from "@/lib/conexion";
import type { PuestoSemana } from "@/lib/puestos-voluntario";

/** Tarjeta "Tu puesto esta semana" para la página pública del voluntario. */
export default function MisPuestos({
  puestos,
  lunes,
  publicada,
}: {
  puestos: PuestoSemana[];
  lunes: Date;
  publicada: boolean;
}) {
  if (!publicada && puestos.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
        Tu líder aún está armando la distribución de puestos. Vuelve a abrir este link más cerca del encuentro.
      </p>
    );
  }
  if (puestos.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Esta semana no tienes un puesto asignado. ¡Gracias por tu disponibilidad!
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-sage-500/30">
      <p className="flex items-center gap-2 bg-sage-600 px-4 py-2 text-sm font-semibold text-white">
        <MapPin className="h-4 w-4" /> Tu puesto esta semana
      </p>
      <ul className="divide-y divide-slate-100 bg-white">
        {puestos.map((p, i) => {
          const enc = ENCUENTROS.find((e) => e.value === p.encuentro);
          return (
            <li key={i} className="px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {enc?.largo} · {enc ? formatoFecha(sumarDias(lunes, enc.diaOffset)) : ""}
              </p>
              <p className="text-base font-semibold text-slate-900">{p.puesto}</p>
              <p className="text-sm text-slate-600">
                {p.area}
                {p.encargado ? ` · Encargado: ${p.encargado}` : ""}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
