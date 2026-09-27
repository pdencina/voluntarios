import Link from "next/link";
import { BellRing } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatoFecha, hoySantiago, sumarDias } from "@/lib/conexion";
import { voluntariosPorEquipo } from "@/lib/queries";
import { enlaceReunion } from "@/lib/reunion";
import { origenSitio } from "@/lib/origen";
import CopyTextButton from "../conexion/CopyTextButton";

/** Para líderes: quiénes de su equipo no han respondido la convocatoria abierta, con mensaje listo para el grupo. */
export default async function PendientesEquipo({ equipoIds }: { equipoIds: string[] }) {
  if (!equipoIds.length) return null;
  const hoy = new Date(`${hoySantiago().fecha}T00:00:00.000Z`);
  const semana = await prisma.semanaServicio.findFirst({
    where: { abierta: true },
    orderBy: { fechaLunes: "desc" },
  });
  if (!semana || sumarDias(semana.fechaLunes, 6) < hoy) return null;

  const [equipos, porEquipo, origen] = await Promise.all([
    prisma.equipo.findMany({ where: { id: { in: equipoIds } }, select: { id: true, nombre: true } }),
    voluntariosPorEquipo(equipoIds, semana.id),
    origenSitio(),
  ]);

  const filas = equipos
    .map((e) => {
      const vols = porEquipo.get(e.id) ?? [];
      const pendientes = vols.filter((v) => !v.respuestas[0]?.respondidoAt);
      const mensaje = [
        `¡Hola equipo ${e.nombre}! 🙌 Ya está abierta la convocatoria de la semana del ${formatoFecha(semana.fechaLunes)}.`,
        pendientes.length ? `Nos falta la respuesta de: ${pendientes.map((p) => p.nombre.split(" ")[0]).join(", ")}.` : "",
        `Entren aquí, toquen su nombre y marquen su disponibilidad (toma un minuto): ${enlaceReunion(origen, semana.id, e.id)}`,
        "¡Gracias por servir!",
      ]
        .filter(Boolean)
        .join("\n");
      return { equipo: e, total: vols.length, pendientes, mensaje };
    })
    .filter((f) => f.total > 0);

  const totalPend = filas.reduce((s, f) => s + f.pendientes.length, 0);
  if (!filas.length) return null;

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${totalPend ? "border-accent-300 bg-accent-200/40" : "border-slate-200/80 bg-white"}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand-700">
          <BellRing className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold text-slate-900">
            {totalPend ? `${totalPend} de tu equipo aún no responden` : "¡Todo tu equipo respondió!"}
          </h2>
          <p className="text-xs text-slate-600">Semana del {formatoFecha(semana.fechaLunes)}</p>
        </div>
      </div>
      <ul className="space-y-3">
        {filas.map((f) => (
          <li key={f.equipo.id} className="rounded-lg bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {f.equipo.nombre}{" "}
                <span className="font-normal text-slate-500">
                  · {f.total - f.pendientes.length}/{f.total} respondieron
                </span>
              </p>
              <div className="flex gap-2">
                <CopyTextButton texto={f.mensaje} etiqueta="Copiar mensaje para el grupo" />
                <Link
                  href={`/convocatorias/${semana.id}?pendientes=1`}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Ver pendientes
                </Link>
              </div>
            </div>
            {f.pendientes.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Faltan: {f.pendientes.slice(0, 10).map((p) => p.nombre).join(", ")}
                {f.pendientes.length > 10 ? ` y ${f.pendientes.length - 10} más` : ""}
              </p>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        El mensaje incluye el link de reunión del equipo: cualquiera que lo abra puede responder por las personas de la lista.
        Compártelo solo en el grupo del equipo.
      </p>
    </div>
  );
}
