import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ENCUENTROS, formatoFecha, hoySantiago, sumarDias } from "@/lib/conexion";
import { CLAVE_FRANJA } from "@/lib/distribucion-datos";
import { encuentrosDelDia } from "@/lib/semana";
import { firmaLlegadaValida } from "@/lib/reunion";
import ListaLlegada from "./ListaLlegada";

export const metadata: Metadata = { title: "Registro de llegada · Voluntarios CPA" };

export default async function LlegadaPage({
  params,
  searchParams,
}: {
  params: Promise<{ semanaId: string; encuentro: string }>;
  searchParams: Promise<{ f?: string }>;
}) {
  const { semanaId, encuentro } = await params;
  const { f } = await searchParams;
  if (!firmaLlegadaValida(semanaId, encuentro, f)) notFound();

  const semana = await prisma.semanaServicio.findUnique({ where: { id: semanaId } });
  const enc = ENCUENTROS.find((e) => e.value === encuentro);
  if (!semana || !enc) notFound();

  const esHoy = encuentrosDelDia(semana.fechaLunes, hoySantiago().fecha).includes(encuentro);

  const [asignaciones, disponibles, llegadas] = await Promise.all([
    prisma.asignacionPuesto.findMany({
      where: { semanaId, encuentro },
      include: { voluntario: { select: { id: true, nombre: true } }, puesto: { select: { nombre: true } } },
    }),
    prisma.respuesta.findMany({
      where: { semanaId, [CLAVE_FRANJA[encuentro]]: true, voluntario: { activo: true } },
      include: { voluntario: { select: { id: true, nombre: true } } },
    }),
    prisma.asistencia.findMany({ where: { semanaId, encuentro }, select: { voluntarioId: true } }),
  ]);

  const personas = new Map<string, { id: string; nombre: string; puesto: string | null }>();
  for (const a of asignaciones) personas.set(a.voluntarioId, { ...a.voluntario, puesto: a.puesto.nombre });
  for (const r of disponibles) if (!personas.has(r.voluntarioId)) personas.set(r.voluntarioId, { ...r.voluntario, puesto: null });
  const lista = [...personas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <div className="flex min-h-full flex-1 items-start justify-center bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 px-4 py-8">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-brand-600 px-6 py-5 text-white">
          <p className="text-xs uppercase tracking-wide text-brand-300">Registro de llegada</p>
          <h1 className="text-xl font-bold">{enc.largo}</h1>
          <p className="text-sm text-brand-200">{formatoFecha(sumarDias(semana.fechaLunes, enc.diaOffset))}</p>
        </div>
        <div className="p-6">
          {esHoy ? (
            <ListaLlegada
              semanaId={semanaId}
              encuentro={encuentro}
              firma={f as string}
              personas={lista}
              llegaron={llegadas.map((l) => l.voluntarioId)}
            />
          ) : (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Este código se habilita el día del encuentro. ¡Nos vemos ese día!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
