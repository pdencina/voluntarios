"use client";

import Link from "next/link";
import { useActionState } from "react";
import { crearPostulacionAction } from "@/lib/postulaciones";
import { TIEMPO_IGLESIA } from "@/lib/constants";

const input =
  "w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";
const label = "mb-1 block text-sm font-medium text-slate-700";

export default function NuevaForm({ equipos }: { equipos: { id: string; nombre: string }[] }) {
  const [state, formAction, pending] = useActionState(crearPostulacionAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={label}>Nombre completo *</label>
        <input name="nombre" required className={input} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Teléfono / WhatsApp *</label>
          <input name="telefono" required placeholder="9 1234 5678" className={input} />
        </div>
        <div>
          <label className={label}>Correo</label>
          <input type="email" name="correo" className={input} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Fecha de nacimiento</label>
          <input type="date" name="fechaNacimiento" className={input} />
        </div>
        <div>
          <label className={label}>Tiempo en la iglesia *</label>
          <select name="tiempoIglesia" required defaultValue="" className={input}>
            <option value="" disabled>
              Selecciona…
            </option>
            {TIEMPO_IGLESIA.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Equipo de interés</label>
          <select name="equipoInteresId" defaultValue="" className={input}>
            <option value="">Sin definir</option>
            {equipos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Recomendado por (líder)</label>
          <input name="recomendadoPor" className={input} />
        </div>
      </div>
      <div>
        <label className={label}>Observaciones</label>
        <textarea name="observaciones" rows={3} className={input} />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Registrar ingreso"}
        </button>
        <Link
          href="/ingreso-voluntariado"
          className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
