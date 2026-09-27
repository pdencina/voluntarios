import Link from "next/link";
import { AlertTriangle, BatteryLow, UserX, Users } from "lucide-react";
import { alertasPastorales } from "@/lib/alertas";
import { formatoFecha } from "@/lib/conexion";

function Bloque({
  icono: Icono,
  titulo,
  ayuda,
  children,
  vacio,
}: {
  icono: typeof Users;
  titulo: string;
  ayuda: string;
  children: React.ReactNode;
  vacio: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Icono className="h-4 w-4 text-accent-500" /> {titulo}
      </p>
      <p className="mb-2 text-xs text-slate-500">{ayuda}</p>
      {vacio ? <p className="text-sm text-sage-700">Todo bien por aquí.</p> : children}
    </div>
  );
}

const Persona = ({ id, nombre, dato }: { id: string; nombre: string; dato: string }) => (
  <li className="flex justify-between gap-2 text-sm">
    <Link href={`/voluntarios/${encodeURIComponent(id)}`} className="truncate text-slate-800 hover:underline">
      {nombre}
    </Link>
    <span className="shrink-0 text-xs text-slate-500">{dato}</span>
  </li>
);

export default async function AlertasPastorales({ alcance }: { alcance: string[] | null }) {
  const a = await alertasPastorales(alcance);
  const total = a.sinResponder.length + a.sobrecargados.length + a.faltas.length + a.deficits.length;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-200 text-brand-700">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Alertas pastorales</h2>
            <p className="text-xs text-slate-500">Para acompañar a tiempo a quien lo necesita.</p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${total ? "bg-accent-200 text-brand-800" : "bg-sage-500/10 text-sage-700"}`}>
          {total ? `${total} para revisar` : "Sin alertas"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Bloque
          icono={Users}
          titulo="Áreas cortas la próxima semana"
          ayuda={
            a.semanaProxima
              ? `Semana del ${formatoFecha(a.semanaProxima)}, con las respuestas recibidas hasta ahora.`
              : "No hay una convocatoria abierta."
          }
          vacio={a.deficits.length === 0}
        >
          <ul className="space-y-1">
            {a.deficits.slice(0, 8).map((d) => (
              <li key={`${d.area}-${d.encuentro}`} className="flex justify-between gap-2 text-sm">
                <span className="truncate text-slate-800">
                  {d.area} · {d.encuentro}
                </span>
                <span className="shrink-0 text-xs font-semibold text-red-600">faltan {d.faltan}</span>
              </li>
            ))}
          </ul>
        </Bloque>

        <Bloque
          icono={UserX}
          titulo="Hace semanas que no responden"
          ayuda="3 o más convocatorias seguidas sin responder. Quizás vale una llamada."
          vacio={a.sinResponder.length === 0}
        >
          <ul className="space-y-1">
            {a.sinResponder.slice(0, 8).map((p) => (
              <Persona key={p.id} id={p.id} nombre={p.nombre} dato={`${p.semanas} semanas`} />
            ))}
            {a.sinResponder.length > 8 && <li className="text-xs text-slate-500">y {a.sinResponder.length - 8} más</li>}
          </ul>
        </Bloque>

        <Bloque
          icono={BatteryLow}
          titulo="Posible sobrecarga"
          ayuda="Sirvieron 5 o más de los 6 encuentros de las últimas dos semanas."
          vacio={a.sobrecargados.length === 0}
        >
          <ul className="space-y-1">
            {a.sobrecargados.slice(0, 8).map((p) => (
              <Persona key={p.id} id={p.id} nombre={p.nombre} dato={`${p.encuentros} encuentros`} />
            ))}
          </ul>
        </Bloque>

        <Bloque
          icono={AlertTriangle}
          titulo="No llegaron a su puesto"
          ayuda="2 o más ausencias en el último mes (solo encuentros con registro de llegada)."
          vacio={a.faltas.length === 0}
        >
          <ul className="space-y-1">
            {a.faltas.slice(0, 8).map((p) => (
              <Persona key={p.id} id={p.id} nombre={p.nombre} dato={`${p.faltas} ausencias`} />
            ))}
          </ul>
        </Bloque>
      </div>
    </div>
  );
}
