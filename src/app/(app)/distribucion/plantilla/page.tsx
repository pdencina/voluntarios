import Link from "next/link";
import BotonConfirmar from "@/components/BotonConfirmar";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { esAdmin } from "@/lib/constants";
import { ENCUENTROS } from "@/lib/conexion";
import {
  eliminarAreaAction,
  eliminarPuestoAction,
  guardarAreaAction,
  guardarPuestoAction,
  sugerirGeneroAction,
} from "@/lib/distribucion-actions";

const input = "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand-500";

export default async function PlantillaPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!esAdmin(user.rol)) redirect("/distribucion");

  const [areas, equipos, sinGenero, total] = await Promise.all([
    prisma.areaServicio.findMany({ orderBy: { orden: "asc" }, include: { puestos: { orderBy: { orden: "asc" } } } }),
    prisma.equipo.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.voluntario.count({ where: { activo: true, genero: null } }),
    prisma.voluntario.count({ where: { activo: true } }),
  ]);

  const opcionesEquipo = () => (
    <>
      <option value="">— sin equipo específico —</option>
      {equipos.map((e) => (
        <option key={e.id} value={e.id}>
          {e.nombre}
        </option>
      ))}
    </>
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/distribucion" className="text-sm text-slate-500 hover:underline">
          ← Distribución
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900">Plantilla de áreas y puestos</h1>
        <p className="text-sm text-slate-500">
          Define qué áreas y puestos tiene la planilla, cuántas personas van en cada uno y qué equipo los cubre.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Género de los voluntarios</p>
          <p>
            {sinGenero} de {total} voluntarios no tienen género registrado. Se necesita para puestos como “Baños mujeres/hombres”.
          </p>
        </div>
        <form action={sugerirGeneroAction}>
          <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Sugerir género por nombre
          </button>
        </form>
      </div>
      <p className="-mt-3 text-xs text-slate-500">
        La sugerencia usa el primer nombre y solo completa a quienes no tienen género. Corrige los casos dudosos en la ficha de cada voluntario.
      </p>

      {areas.map((a) => (
        <div key={a.id} className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <form action={guardarAreaAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={a.id} />
            <label className="text-xs text-slate-500">
              Área
              <input name="nombre" defaultValue={a.nombre} className={`${input} mt-1 block w-52 font-semibold`} />
            </label>
            <label className="text-xs text-slate-500">
              Encargado de área
              <input name="encargado" defaultValue={a.encargado ?? ""} className={`${input} mt-1 block w-48`} />
            </label>
            <label className="text-xs text-slate-500">
              Equipo que la cubre
              <select name="equipoId" defaultValue={a.equipoId ?? ""} className={`${input} mt-1 block w-48`}>
                {opcionesEquipo()}
              </select>
            </label>
            <label className="flex items-center gap-1.5 pb-2 text-sm text-slate-700">
              <input type="checkbox" name="general" defaultChecked={a.general} /> Servicio general (equipos rotativos)
            </label>
            <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Guardar área</button>
          </form>
          <form action={eliminarAreaAction} className="mt-2">
            <input type="hidden" name="id" value={a.id} />
            <BotonConfirmar
              className="text-xs text-red-600 hover:underline"
              titulo={`¿Eliminar el área “${a.nombre}”?`}
              mensaje={<>Se borrarán sus {a.puestos.length} puestos y todas las asignaciones de voluntarios hechas en ellos, también en semanas anteriores.</>}
            >
              Eliminar área y sus puestos
            </BotonConfirmar>
          </form>

          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            {a.puestos.map((p) => {
              const enc = p.encuentros.split(",");
              return (
                <div key={p.id} className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2">
                  <form action={guardarPuestoAction} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="areaId" value={a.id} />
                    <label className="text-xs text-slate-500">
                      Puesto
                      <input name="nombre" defaultValue={p.nombre} className={`${input} mt-1 block w-56`} />
                    </label>
                    <label className="text-xs text-slate-500">
                      Cupos
                      <input name="cupos" type="number" min={1} max={20} defaultValue={p.cupos} className={`${input} mt-1 block w-16`} />
                    </label>
                    <label className="text-xs text-slate-500">
                      Género
                      <select name="genero" defaultValue={p.genero ?? ""} className={`${input} mt-1 block w-28`}>
                        <option value="">Cualquiera</option>
                        <option value="F">Mujeres</option>
                        <option value="M">Hombres</option>
                      </select>
                    </label>
                    <label className="text-xs text-slate-500">
                      Equipo del puesto
                      <select name="equipoId" defaultValue={p.equipoId ?? ""} className={`${input} mt-1 block w-40`}>
                        {opcionesEquipo()}
                      </select>
                    </label>
                    <label className="flex items-center gap-1 pb-2 text-xs text-slate-600">
                      <input type="checkbox" name="rota" defaultChecked={p.rota} /> Rota
                    </label>
                    <div className="flex items-center gap-2 pb-2 text-xs text-slate-600">
                      {ENCUENTROS.map((e) => (
                        <label key={e.value} className="flex items-center gap-1">
                          <input type="checkbox" name="encuentros" value={e.value} defaultChecked={enc.includes(e.value)} />
                          {e.label}
                        </label>
                      ))}
                    </div>
                    <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Guardar</button>
                  </form>
                  <form action={eliminarPuestoAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <BotonConfirmar
                      className="pb-1 text-xs text-red-600 hover:underline"
                      titulo={`¿Eliminar el puesto “${p.nombre}”?`}
                      mensaje="Se borrarán también las asignaciones de voluntarios hechas en este puesto."
                    >
                      Eliminar
                    </BotonConfirmar>
                  </form>
                </div>
              );
            })}

            <form action={guardarPuestoAction} className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-slate-300 p-2">
              <input type="hidden" name="areaId" value={a.id} />
              <label className="text-xs text-slate-500">
                Nuevo puesto
                <input name="nombre" required className={`${input} mt-1 block w-56`} />
              </label>
              <label className="text-xs text-slate-500">
                Cupos
                <input name="cupos" type="number" min={1} max={20} defaultValue={1} className={`${input} mt-1 block w-16`} />
              </label>
              <input type="hidden" name="genero" value="" />
              <input type="hidden" name="rota" value="on" />
              <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">Agregar puesto</button>
            </form>
          </div>
        </div>
      ))}

      <form action={guardarAreaAction} className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-5">
        <label className="text-xs text-slate-500">
          Nueva área
          <input name="nombre" required className={`${input} mt-1 block w-56`} />
        </label>
        <label className="text-xs text-slate-500">
          Encargado de área
          <input name="encargado" className={`${input} mt-1 block w-48`} />
        </label>
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Agregar área</button>
      </form>
    </div>
  );
}
