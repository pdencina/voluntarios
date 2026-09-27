"use client";

import Link from "next/link";
import { useActionState } from "react";
import { actualizarEquipoAction, crearEquipoAction } from "@/lib/gestion";

const input =
  "w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

type Props = {
  equipo?: {
    id: string;
    nombre: string;
    tipo: string;
    liderNombre: string | null;
    liderContacto: string | null;
  };
};

export default function EquipoForm({ equipo }: Props) {
  const [state, formAction, pending] = useActionState(
    equipo ? actualizarEquipoAction : crearEquipoAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      {equipo && <input type="hidden" name="id" value={equipo.id} />}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
        <input name="nombre" required defaultValue={equipo?.nombre ?? ""} className={input} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
        <select name="tipo" defaultValue={equipo?.tipo ?? "MINISTERIO"} className={input}>
          <option value="MINISTERIO">Ministerio</option>
          <option value="ROTATIVO">Equipo rotativo (servicio general)</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Líder(es)</label>
        <input name="liderNombre" defaultValue={equipo?.liderNombre ?? ""} className={input} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Teléfono / WhatsApp del líder
        </label>
        <input
          name="liderContacto"
          defaultValue={equipo?.liderContacto ?? ""}
          placeholder="9 1234 5678"
          className={input}
        />
        <p className="mt-1 text-xs text-slate-400">
          Se usa para avisarle con un clic cuando se integra alguien nuevo a su equipo.
        </p>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Guardando…" : equipo ? "Guardar cambios" : "Crear equipo"}
        </button>
        <Link
          href={equipo ? `/equipos/${equipo.id}` : "/equipos"}
          className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
