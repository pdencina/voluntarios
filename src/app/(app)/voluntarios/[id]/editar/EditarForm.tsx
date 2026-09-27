"use client";

import Link from "next/link";
import { useActionState } from "react";
import { actualizarVoluntarioAction } from "@/lib/gestion";

type Props = {
  voluntario: {
    id: string;
    nombre: string;
    telefono: string | null;
    correo: string | null;
    fechaNacimiento: string; // yyyy-mm-dd o ""
    fechaNacimientoRaw: string | null;
    observaciones: string | null;
    genero: string | null;
    equipoIds: string[];
  };
  equipos: { id: string; nombre: string }[];
};

const input =
  "w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export default function EditarForm({ voluntario: v, equipos }: Props) {
  const [state, formAction, pending] = useActionState(actualizarVoluntarioAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={v.id} />
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
        <input name="nombre" required defaultValue={v.nombre} className={input} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
          <input name="telefono" defaultValue={v.telefono ?? ""} className={input} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Correo</label>
          <input type="email" name="correo" defaultValue={v.correo ?? ""} className={input} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Fecha de nacimiento</label>
        <input type="date" name="fechaNacimiento" defaultValue={v.fechaNacimiento} className={input} />
        {!v.fechaNacimiento && v.fechaNacimientoRaw && (
          <p className="mt-1 text-xs text-amber-700">
            Valor original del Excel sin interpretar: “{v.fechaNacimientoRaw}”
          </p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Género</label>
        <select name="genero" defaultValue={v.genero ?? ""} className={input}>
          <option value="">Sin indicar</option>
          <option value="F">Mujer</option>
          <option value="M">Hombre</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Observaciones</label>
        <textarea name="observaciones" rows={3} defaultValue={v.observaciones ?? ""} className={input} />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">Equipos</p>
        <div className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto rounded border border-slate-200 p-2 sm:grid-cols-2">
          {equipos.map((eq) => (
            <label key={eq.id} className="flex items-center gap-1.5 text-sm text-slate-700">
              <input
                type="checkbox"
                name="equipoIds"
                value={eq.id}
                defaultChecked={v.equipoIds.includes(eq.id)}
              />
              {eq.nombre}
            </label>
          ))}
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        <Link
          href={`/voluntarios/${encodeURIComponent(v.id)}`}
          className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
