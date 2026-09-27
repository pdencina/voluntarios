import Link from "next/link";
import { Cake } from "lucide-react";
import { cumpleanosDeLaSemana } from "@/lib/alertas";
import { hoySantiago } from "@/lib/conexion";
import { enlaceWhatsApp } from "@/lib/logica";

const fmt = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export default async function Cumpleanos({ alcance }: { alcance: string[] | null }) {
  const { lista } = await cumpleanosDeLaSemana(alcance);
  const hoy = hoySantiago().fecha;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-200 text-brand-700">
          <Cake className="h-5 w-5" />
        </span>
        <h2 className="font-semibold text-slate-900">Cumpleaños de esta semana</h2>
      </div>
      {lista.length === 0 ? (
        <p className="text-sm text-slate-500">Nadie de tu equipo está de cumpleaños esta semana.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {lista.map((c) => {
            const esHoy = c.fecha.toISOString().slice(0, 10) === hoy;
            const wa = enlaceWhatsApp(
              c.telefono,
              `¡Feliz cumpleaños, ${c.nombre.split(" ")[0]}! 🎉 Gracias por tu servicio y tu corazón. Que Dios te bendiga mucho en este nuevo año de vida.`
            );
            return (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <Link href={`/voluntarios/${encodeURIComponent(c.id)}`} className="block truncate text-sm font-medium text-slate-900 hover:underline">
                    {c.nombre}
                  </Link>
                  <p className="text-xs capitalize text-slate-500">
                    {esHoy ? <b className="text-accent-500">¡Hoy!</b> : fmt.format(c.fecha)} · cumple {c.edad}
                  </p>
                </div>
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-lg border border-sage-600 px-2.5 py-1 text-xs font-medium text-sage-700 hover:bg-sage-500/10"
                  >
                    Saludar
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
