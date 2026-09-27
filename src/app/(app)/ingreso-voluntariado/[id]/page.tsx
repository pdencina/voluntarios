import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ESTADOS_POSTULACION, TIEMPO_IGLESIA, esAdmin, puedePostular } from "@/lib/constants";
import { enlaceWhatsApp } from "@/lib/logica";
import { avisarLiderAction } from "@/lib/postulaciones";
import DecidirForm from "./DecidirForm";
import IntegrarForm from "./IntegrarForm";

const fmtFecha = new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "UTC" });
const fmtHora = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Santiago",
});

export default async function PostulacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  if (!puedePostular(user.rol)) redirect("/");

  const p = await prisma.postulacion.findUnique({
    where: { id },
    include: {
      equipoInteres: { select: { id: true, nombre: true } },
      equipoAsignado: { select: { id: true, nombre: true, liderNombre: true, liderContacto: true } },
      creadaPor: { select: { nombre: true } },
    },
  });
  if (!p) notFound();
  const admin = esAdmin(user.rol);
  if (!admin && p.creadaPorId !== user.id) notFound();

  const equipos = admin
    ? await prisma.equipo.findMany({
        orderBy: [{ tipo: "asc" }, { nombre: "asc" }],
        select: { id: true, nombre: true },
      })
    : [];

  const est = ESTADOS_POSTULACION[p.estado as keyof typeof ESTADOS_POSTULACION];
  const tiempo = TIEMPO_IGLESIA.find((t) => t.value === p.tiempoIglesia)?.label;

  const mensajeLider = p.equipoAsignado
    ? `Hola ${p.equipoAsignado.liderNombre ?? ""}, se sumó ${p.nombre} a tu equipo ${p.equipoAsignado.nombre}. ` +
      `Su teléfono es ${p.telefono ?? "(sin teléfono)"}. ¿Puedes contactarlo/a, sumarlo/a al grupo de WhatsApp del equipo y darle la bienvenida? ¡Gracias!`
    : "";
  const enlaceLider = enlaceWhatsApp(p.equipoAsignado?.liderContacto, mensajeLider);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/ingreso-voluntariado" className="text-sm text-slate-500 hover:underline">
          ← Ingreso Voluntariado
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">{p.nombre}</h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${est?.color}`}>{est?.label}</span>
        </div>
        <p className="text-sm text-slate-500">
          Registrado por {p.creadaPor?.nombre ?? "—"} el {fmtHora.format(p.createdAt)}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Dato titulo="Teléfono" valor={p.telefono} />
          <Dato titulo="Correo" valor={p.correo} />
          <Dato titulo="Fecha de nacimiento" valor={p.fechaNacimiento ? fmtFecha.format(p.fechaNacimiento) : null} />
          <Dato titulo="Tiempo en la iglesia" valor={tiempo} />
          <Dato titulo="Equipo de interés" valor={p.equipoInteres?.nombre} />
          <Dato titulo="Recomendado por" valor={p.recomendadoPor} />
          {p.observaciones && (
            <div className="sm:col-span-2">
              <Dato titulo="Observaciones" valor={p.observaciones} />
            </div>
          )}
        </dl>
      </div>

      {p.decididaAt && (
        <div className={`rounded-lg border p-4 text-sm ${p.estado === "AUN_NO" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
          <p className="font-medium text-slate-900">
            Decisión: {p.estado === "AUN_NO" ? "aún no" : "aceptada"} · {fmtHora.format(p.decididaAt)}
          </p>
          {p.decisionObs && <p className="mt-1 text-slate-700">Observación: {p.decisionObs}</p>}
        </div>
      )}

      {admin && p.estado !== "INTEGRADA" && (
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Decisión</h2>
          <DecidirForm id={p.id} observacionActual={p.decisionObs ?? ""} />
        </div>
      )}

      {admin && p.estado === "ACEPTADA" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="mb-1 font-semibold text-slate-900">Ingresar a un equipo</h2>
          <p className="mb-3 text-sm text-slate-600">
            Se creará como voluntario/a activo/a y quedará pendiente la bienvenida del líder.
          </p>
          <IntegrarForm id={p.id} equipos={equipos} sugerido={p.equipoInteres?.id ?? ""} />
        </div>
      )}

      {p.estado === "INTEGRADA" && p.equipoAsignado && (
        <div className="space-y-3 rounded-lg border border-sky-200 bg-sky-50 p-5 text-sm">
          <h2 className="font-semibold text-slate-900">
            Integrada a {p.equipoAsignado.nombre}
            {p.integradaAt && <span className="font-normal text-slate-500"> · {fmtHora.format(p.integradaAt)}</span>}
          </h2>
          <p className="text-slate-700">
            Líder: {p.equipoAsignado.liderNombre ?? "sin líder asignado"}
            {p.equipoAsignado.liderContacto ? ` · ${p.equipoAsignado.liderContacto}` : ""}
          </p>
          <ul className="space-y-1 text-slate-700">
            <li>{p.liderAvisadoAt ? `✓ Líder avisado (${fmtHora.format(p.liderAvisadoAt)})` : "○ Líder sin avisar"}</li>
            <li>{p.bienvenidaAt ? `✓ Bienvenida realizada (${fmtHora.format(p.bienvenidaAt)})` : "○ Bienvenida pendiente"}</li>
          </ul>
          {admin && !p.liderAvisadoAt && (
            <div className="flex flex-wrap gap-2">
              {enlaceLider ? (
                <a
                  href={enlaceLider}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
                >
                  Avisar al líder por WhatsApp
                </a>
              ) : (
                <span className="text-xs text-amber-700">
                  Agrega el teléfono del líder en la ficha del equipo para avisarle con un clic.
                </span>
              )}
              <form action={avisarLiderAction}>
                <input type="hidden" name="id" value={p.id} />
                <button className="rounded border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-100">
                  Marcar líder como avisado
                </button>
              </form>
            </div>
          )}
          {p.voluntarioId && (
            <Link
              href={`/voluntarios/${encodeURIComponent(p.voluntarioId)}`}
              className="inline-block font-medium text-brand-700 underline underline-offset-2"
            >
              Ver ficha de voluntario →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-400">{titulo}</dt>
      <dd className="text-sm text-slate-800">{valor || "—"}</dd>
    </div>
  );
}
