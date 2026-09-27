"use client";

import { useActionState } from "react";
import { pasarAIngresoVoluntariadoAction } from "@/lib/conexion-actions";

export default function PasarAIngresoForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(pasarAIngresoVoluntariadoAction, undefined);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <button
        disabled={pending}
        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
      >
        {pending ? "Creando…" : "Pasar a Ingreso Voluntariado"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
