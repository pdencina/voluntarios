import Link from "next/link";
import FormAccion from "@/components/FormAccion";
import BotonConfirmar from "@/components/BotonConfirmar";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedePostular } from "@/lib/constants";
import { puedeConexion } from "@/lib/conexion-acceso";
import { ESTADOS_PERSONA, formatoFecha } from "@/lib/conexion";
import { enlaceWhatsApp } from "@/lib/logica";
import { avanzarPersonaAction, eliminarPersonaNuevaAction } from "@/lib/conexion-actions";
import EditarPersonaForm from "./EditarPersonaForm";
import PasarAIngresoForm from "./PasarAIngresoForm";

export default async function PersonaNuevaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  if (!(await puedeConexion(user))) redirect("/");

  const p = await prisma.personaNueva.findUnique({ where: { id } });
  if (!p) notFound();

  const est = ESTADOS_PERSONA[p.estado as keyof typeof ESTADOS_PERSONA];
  const wa = enlaceWhatsApp(
    p.telefono,
    `¡Hola ${p.nombre.split(" ")[0]}! Te saluda el equipo de Conexión de la iglesia. Nos alegró mucho conocerte. ¿Cómo estás?`
  );
  const hoy = new Date().toISOString().slice(0, 10);

  const hitos = [
    { etiqueta: "Contactada", estado: "CONTACTADA", fecha: p.contactadaAt },
    { etiqueta: "Paso 1", estado: "PASO_1", fecha: p.paso1At },
    { etiqueta: "Paso 2", estado: "PASO_2", fecha: p.paso2At },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/conexion" className="text-sm text-slate-500 hover:underline">
          ← Conexión
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">{p.nombre}</h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${est?.color}`}>{est?.label}</span>
        </div>
        <p className="text-sm text-slate-500">
          Llegó el {formatoFecha(p.fechaLlegada)} · {p.campus}
          {p.telefono ? ` · ${p.telefono}` : ""}
        </p>
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-emerald-700 hover:underline">
            Escribir por WhatsApp →
          </a>
        )}
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Seguimiento</h2>
        <ul className="space-y-2">
          {hitos.map((h) => (
            <li key={h.estado} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className={h.fecha ? "text-slate-900" : "text-slate-500"}>
                {h.fecha ? "✓" : "○"} {h.etiqueta}
                {h.fecha && <span className="text-slate-400"> · {formatoFecha(h.fecha)}</span>}
              </span>
              {!h.fecha && (
                <FormAccion action={avanzarPersonaAction} exito="Seguimiento actualizado." className="flex items-center gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="estado" value={h.estado} />
                  <input
                    type="date"
                    name="fecha"
                    defaultValue={hoy}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                  <button className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100">
                    Marcar
                  </button>
                </FormAccion>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Datos</h2>
        <EditarPersonaForm
          id={p.id}
          inicial={{
            nombre: p.nombre,
            telefono: p.telefono ?? "",
            campus: p.campus,
            fechaLlegada: p.fechaLlegada.toISOString().slice(0, 10),
            encuentro: p.encuentro,
            categoria: p.categoria,
            origen: p.origen,
            atendidaPor: p.atendidaPor ?? "",
            observaciones: p.observaciones ?? "",
          }}
        />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        {puedePostular(user.rol) ? <PasarAIngresoForm id={p.id} /> : <span />}
        <form action={eliminarPersonaNuevaAction}>
          <input type="hidden" name="id" value={p.id} />
          <BotonConfirmar
            className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
            titulo="¿Eliminar este registro?"
            mensaje={<>Se borrará a <b>{p.nombre}</b> y su seguimiento. También dejará de contar en los reportes semanales.</>}
          >
            Eliminar registro
          </BotonConfirmar>
        </form>
      </div>
    </div>
  );
}
