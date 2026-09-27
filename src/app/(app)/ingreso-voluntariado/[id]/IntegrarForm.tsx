"use client";

import { useActionState } from "react";
import { integrarPostulacionAction } from "@/lib/postulaciones";

type Props = { id: string; equipos: { id: string; nombre: string }[]; sugerido: string };

export default function IntegrarForm({ id, equipos, sugerido }: Props) {
  const [state, formAction, pending] = useActionState(integrarPostulacionAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={id} />
      <div className="min-w-56 flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700">Equipo</label>
        <select
          name="equipoId"
          defaultValue={sugerido}
          required
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Selecciona…
          </option>
          {equipos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </div>
      <button
        disabled={pending}
        className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Ingresando…" : "Ingresar al equipo"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
