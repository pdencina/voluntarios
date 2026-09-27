"use client";

import { useActionState } from "react";
import { decidirPostulacionAction } from "@/lib/postulaciones";

export default function DecidirForm({ id, observacionActual }: { id: string; observacionActual: string }) {
  const [state, formAction, pending] = useActionState(decidirPostulacionAction, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Observación (obligatoria si es “aún no”)
        </label>
        <textarea
          name="observacion"
          rows={3}
          defaultValue={observacionActual}
          placeholder="Ej.: Aún no completa 6 meses; reevaluar en marzo."
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700">{state.ok}</p>}
      <div className="flex gap-2">
        <button
          name="decision"
          value="ACEPTADA"
          disabled={pending}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          Aceptar
        </button>
        <button
          name="decision"
          value="AUN_NO"
          disabled={pending}
          className="rounded border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          Aún no
        </button>
      </div>
    </form>
  );
}
