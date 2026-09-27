import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ENCUENTROS, formatoFecha, sumarDias } from "@/lib/conexion";
import { puedeArmarTodo } from "@/lib/distribucion-permisos";
import { puestosDeLaSemana } from "@/lib/puestos-voluntario";
import { enlaceWhatsApp } from "@/lib/logica";
import { origenSitio } from "@/lib/origen";
import ListaAvisos, { type Aviso } from "./ListaAvisos";

export default async function AvisarPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { semana: semanaParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;

  const semana =
    (semanaParam && (await prisma.semanaServicio.findUnique({ where: { id: semanaParam } }))) ||
    (await prisma.semanaServicio.findFirst({ where: { abierta: true }, orderBy: { fechaLunes: "desc" } }));
  if (!semana) return <p className="text-sm text-slate-500">No hay convocatorias.</p>;

  const todo = await puedeArmarTodo(user);
  const asignaciones = await prisma.asignacionPuesto.findMany({
    where: {
      semanaId: semana.id,
      ...(todo
        ? {}
        : {
            OR: [
              { puesto: { equipoId: { in: user.equipoIds } } },
              { puesto: { area: { equipoId: { in: user.equipoIds } } } },
            ],
          }),
    },
    select: { voluntarioId: true },
  });
  const ids = [...new Set(asignaciones.map((a) => a.voluntarioId))];

  const [voluntarios, respuestas, puestos, origen] = await Promise.all([
    prisma.voluntario.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true, telefono: true } }),
    prisma.respuesta.findMany({ where: { semanaId: semana.id, voluntarioId: { in: ids } }, select: { voluntarioId: true, token: true } }),
    puestosDeLaSemana(semana.id, ids),
    origenSitio(),
  ]);
  const token = new Map(respuestas.map((r) => [r.voluntarioId, r.token]));

  const avisos: Aviso[] = voluntarios
    .map((v) => {
      const mios = puestos.get(v.id) ?? [];
      const lineas = mios.map((p) => {
        const enc = ENCUENTROS.find((e) => e.value === p.encuentro)!;
        return `• ${enc.largo} (${formatoFecha(sumarDias(semana.fechaLunes, enc.diaOffset))}): ${p.puesto} — ${p.area}${
          p.encargado ? `, encargado ${p.encargado}` : ""
        }`;
      });
      const link = token.get(v.id) ? `${origen}/confirmar/${token.get(v.id)}` : null;
      const mensaje = [
        `¡Hola ${v.nombre.split(" ")[0]}! Gracias por servir esta semana 🙌`,
        "",
        mios.length === 1 ? "Tu puesto:" : "Tus puestos:",
        ...lineas,
        ...(link ? ["", `Detalles y registro de llegada: ${link}`] : []),
        "",
        "¡Dios te bendiga!",
      ].join("\n");
      return {
        id: v.id,
        nombre: v.nombre,
        telefono: v.telefono,
        resumen: mios.map((p) => `${ENCUENTROS.find((e) => e.value === p.encuentro)?.label}: ${p.puesto}`),
        whatsapp: enlaceWhatsApp(v.telefono, mensaje),
        mensaje,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/distribucion?semana=${semana.id}`} className="text-sm text-slate-500 hover:underline">
          ← Distribución
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900">Avisar puestos por WhatsApp</h1>
        <p className="text-sm text-slate-500">
          Semana del {formatoFecha(semana.fechaLunes)} · {avisos.length} voluntarios con puesto. Cada botón abre WhatsApp con su
          mensaje listo; quedan marcados en este dispositivo a medida que avisas.
        </p>
      </div>
      <ListaAvisos semanaId={semana.id} avisos={avisos} />
    </div>
  );
}
