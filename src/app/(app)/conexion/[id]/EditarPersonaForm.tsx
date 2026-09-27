"use client";

import { useActionState, useState } from "react";
import { actualizarPersonaNuevaAction } from "@/lib/conexion-actions";
import PersonaCampos, { type ValoresPersona } from "../PersonaCampos";

export default function EditarPersonaForm({ id, inicial }: { id: string; inicial: ValoresPersona }) {
  const [state, formAction, pending] = useActionState(actualizarPersonaNuevaAction, undefined);
  const [v, setV] = useState<ValoresPersona>(inicial);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <PersonaCampos v={v} cambiar={(k, val) => setV((p) => ({ ...p, [k]: val }))} />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700">{state.ok}</p>}
      <button
        disabled={pending}
        className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
