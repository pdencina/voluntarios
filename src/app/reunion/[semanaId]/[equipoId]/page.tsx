import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, HeartHandshake, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FRANJAS } from "@/lib/constants";
import { sumarDias } from "@/lib/conexion";
import { firmaValida } from "@/lib/reunion";
import ReunionForm from "./ReunionForm";

const fmtSemana = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const fmtDia = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const DIAS_FRANJA = [3, 6, 6];

const Marco = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-full flex-1 items-start justify-center bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 px-4 py-8 sm:items-center">
    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">{children}</div>
  </div>
);

export default async function ReunionPage({
  params,
  searchParams,
}: {
  params: Promise<{ semanaId: string; equipoId: string }>;
  searchParams: Promise<{ f?: string; v?: string; gracias?: string }>;
}) {
  const { semanaId, equipoId } = await params;
  const { f, v, gracias } = await searchParams;
  if (!firmaValida(semanaId, equipoId, f)) notFound();

  const [semana, equipo] = await Promise.all([
    prisma.semanaServicio.findUnique({ where: { id: semanaId } }),
    prisma.equipo.findUnique({ where: { id: equipoId } }),
  ]);
  if (!semana || !equipo) notFound();

  const voluntarios = await prisma.voluntario.findMany({
    where: { activo: true, equipos: { some: { equipoId } } },
    include: { respuestas: { where: { semanaId } } },
    orderBy: { nombre: "asc" },
  });
  const firma = f as string;

  if (!semana.abierta) {
    return (
      <Marco>
        <div className="p-6">
          <h1 className="text-xl font-bold text-brand-900">{equipo.nombre}</h1>
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Esta convocatoria ya está cerrada. Si necesitas cambiar tu respuesta, avisa a tu líder.
          </p>
        </div>
      </Marco>
    );
  }

  // Pantalla de gracias tras responder
  const graciasA = gracias ? voluntarios.find((x) => x.id === gracias) : null;
  if (graciasA) {
    const r = graciasA.respuestas[0];
    const resumen = FRANJAS.map((fr, i) => ({
      label: fr.label,
      dia: fmtDia.format(sumarDias(semana.fechaLunes, DIAS_FRANJA[i])),
      si: r?.[fr.key] === true,
    }));
    const hay = resumen.some((x) => x.si);
    return (
      <Marco>
        <div className="bg-gradient-to-br from-accent-300 to-accent-400 px-6 py-6 text-center text-brand-900">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/70">
            <HeartHandshake className="h-7 w-7" />
          </span>
          <h1 className="text-xl font-bold leading-snug">
            ¡Gracias, {graciasA.nombre.split(" ")[0]}, por ser parte de esta semana de servicio!
          </h1>
        </div>
        <div className="space-y-4 p-6">
          <p className="text-sm text-slate-600">
            {hay ? "Tu equipo cuenta contigo. Quedó registrado:" : "Gracias por avisarnos con tiempo. Te esperamos en la próxima semana de servicio."}
          </p>
          <ul className="space-y-2">
            {resumen.map((x) => (
              <li
                key={x.label}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${x.si ? "border-sage-500/30 bg-sage-500/10" : "border-slate-200 bg-slate-50"}`}
              >
                {x.si ? <CheckCircle2 className="h-5 w-5 text-sage-600" /> : <XCircle className="h-5 w-5 text-slate-400" />}
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{x.label}</span>
                  <span className="block text-xs capitalize text-slate-500">{x.dia}</span>
                </span>
                <span className={`text-xs font-medium ${x.si ? "text-sage-700" : "text-slate-500"}`}>
                  {x.si ? "Estarás" : "No podrás"}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href={`/reunion/${semanaId}/${equipoId}?f=${firma}`}
            className="block rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700"
          >
            Listo, siguiente persona
          </Link>
        </div>
      </Marco>
    );
  }

  const elegido = v ? voluntarios.find((x) => x.id === v) : null;
  const total = voluntarios.length;
  const respondieron = voluntarios.filter((x) => x.respuestas[0]?.respondidoAt).length;

  return (
    <Marco>
      <div className="bg-brand-600 px-6 py-5 text-white">
        <p className="text-xs uppercase tracking-wide text-brand-300">Reunión de equipo</p>
        <h1 className="text-xl font-bold">{equipo.nombre}</h1>
        <p className="text-sm text-brand-200">
          Semana de servicio del {fmtSemana.format(semana.fechaLunes)}
        </p>
      </div>

      {elegido ? (
        <div className="p-6">
          <Link href={`/reunion/${semanaId}/${equipoId}?f=${firma}`} className="text-sm text-slate-500 hover:underline">
            ← No soy yo
          </Link>
          <h2 className="mt-2 text-lg font-bold text-brand-900">Hola, {elegido.nombre.split(" ")[0]} 👋</h2>
          <p className="mb-4 text-sm text-slate-500">Confirma tu disponibilidad para esta semana.</p>
          <ReunionForm
            semanaId={semanaId}
            equipoId={equipoId}
            firma={firma}
            voluntarioId={elegido.id}
            respuesta={{
              disponibleJueves: elegido.respuestas[0]?.disponibleJueves ?? null,
              disponibleDomingoAM: elegido.respuestas[0]?.disponibleDomingoAM ?? null,
              disponibleDomingoPM: elegido.respuestas[0]?.disponibleDomingoPM ?? null,
            }}
          />
        </div>
      ) : (
        <div className="p-6">
          <h2 className="text-lg font-bold text-brand-900">¿Quién eres?</h2>
          <p className="mb-1 text-sm text-slate-500">Toca tu nombre para dejar tu disponibilidad.</p>
          <p className="mb-4 text-xs text-slate-400">
            {respondieron} de {total} ya respondieron
          </p>
          <ul className="space-y-2">
            {voluntarios.map((x) => {
              const listo = !!x.respuestas[0]?.respondidoAt;
              return (
                <li key={x.id}>
                  <Link
                    href={`/reunion/${semanaId}/${equipoId}?f=${firma}&v=${encodeURIComponent(x.id)}`}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                      listo
                        ? "border-sage-500/30 bg-sage-500/10 text-slate-700"
                        : "border-slate-200 bg-white font-medium text-slate-900 hover:border-brand-400"
                    }`}
                  >
                    <span>{x.nombre}</span>
                    {listo && <CheckCircle2 className="h-5 w-5 text-sage-600" />}
                  </Link>
                </li>
              );
            })}
            {voluntarios.length === 0 && (
              <li className="text-sm text-slate-400">Este equipo aún no tiene voluntarios.</li>
            )}
          </ul>
        </div>
      )}
    </Marco>
  );
}
