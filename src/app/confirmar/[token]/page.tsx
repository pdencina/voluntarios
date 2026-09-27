import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, HeartHandshake, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FRANJAS } from "@/lib/constants";
import { sumarDias } from "@/lib/conexion";
import ConfirmarForm from "./ConfirmarForm";

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

// Jueves = lunes + 3; los dos encuentros del domingo = lunes + 6.
const DIAS_FRANJA = [3, 6, 6];

export default async function ConfirmarPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { token } = await params;
  const { ok } = await searchParams;

  const respuesta = await prisma.respuesta.findUnique({
    where: { token },
    include: { voluntario: true, semana: true },
  });
  if (!respuesta) notFound();

  const nombre = respuesta.voluntario.nombre.split(" ")[0];
  const abierta = respuesta.semana.abierta;
  const yaRespondio = respuesta.respondidoAt !== null;
  const gracias = ok === "1" && yaRespondio;

  const resumen = FRANJAS.map((f, i) => ({
    label: f.label,
    dia: fmtDia.format(sumarDias(respuesta.semana.fechaLunes, DIAS_FRANJA[i])),
    disponible: respuesta[f.key] === true,
  }));
  const sirve = resumen.filter((r) => r.disponible);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {gracias ? (
          <>
            <div className="bg-gradient-to-br from-accent-300 to-accent-400 px-6 py-6 text-center text-brand-900">
              <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/70">
                <HeartHandshake className="h-7 w-7" />
              </span>
              <h1 className="text-xl font-bold leading-snug">
                ¡Gracias, {nombre}, por ser parte de esta semana de servicio!
              </h1>
            </div>
            <div className="space-y-5 p-6">
              {sirve.length > 0 ? (
                <p className="text-sm text-slate-600">
                  Tu equipo cuenta contigo. Esto es lo que quedó registrado:
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  Gracias por avisarnos con tiempo. Te esperamos en la próxima semana de servicio.
                </p>
              )}

              <ul className="space-y-2">
                {resumen.map((r) => (
                  <li
                    key={r.label}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                      r.disponible ? "border-sage-500/30 bg-sage-500/10" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    {r.disponible ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-sage-600" />
                    ) : (
                      <XCircle className="h-5 w-5 shrink-0 text-slate-400" />
                    )}
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-slate-900">{r.label}</span>
                      <span className="block text-xs capitalize text-slate-500">{r.dia}</span>
                    </span>
                    <span className={`text-xs font-medium ${r.disponible ? "text-sage-700" : "text-slate-500"}`}>
                      {r.disponible ? "Estarás" : "No podrás"}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="text-center text-sm italic text-slate-500">
                Servir es un privilegio. ¡Dios te bendiga!
              </p>

              {abierta && (
                <Link
                  href={`/confirmar/${token}`}
                  className="block text-center text-sm font-medium text-brand-700 underline underline-offset-2"
                >
                  Cambiar mi respuesta
                </Link>
              )}
            </div>
          </>
        ) : (
          <div className="p-6">
            <h1 className="text-xl font-bold text-brand-900">Hola, {nombre} 👋</h1>
            <p className="mt-1 text-sm text-slate-500">
              Confirma tu disponibilidad para la semana de servicio del{" "}
              <strong>{fmtSemana.format(respuesta.semana.fechaLunes)}</strong>.
            </p>

            {yaRespondio && abierta && (
              <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-slate-700">
                Ya respondiste esta semana. Si algo cambió, puedes actualizar tu respuesta.
              </p>
            )}

            {!abierta && (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Esta convocatoria ya está cerrada. Si necesitas cambiar tu respuesta, avisa a tu líder.
              </p>
            )}

            {abierta && (
              <div className="mt-5">
                <ConfirmarForm
                  token={token}
                  respuesta={{
                    disponibleJueves: respuesta.disponibleJueves,
                    disponibleDomingoAM: respuesta.disponibleDomingoAM,
                    disponibleDomingoPM: respuesta.disponibleDomingoPM,
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
