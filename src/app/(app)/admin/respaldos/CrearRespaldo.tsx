"use client";

import { useActionState } from "react";
import { DatabaseBackup } from "lucide-react";
import { crearRespaldoAction } from "@/lib/respaldo-actions";

export default function CrearRespaldo() {
  const [state, formAction, pending] = useActionState(crearRespaldoAction, undefined);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <button
        disabled={pending}
        className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        <DatabaseBackup className="h-4 w-4" />
        {pending ? "Creando respaldo…" : "Crear respaldo ahora"}
      </button>
      {state?.ok && <span className="text-sm text-sage-700">{state.ok}</span>}
      {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
    </form>
  );
}
