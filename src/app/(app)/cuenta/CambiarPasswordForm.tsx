"use client";

import { useActionState } from "react";
import { cambiarPasswordPropiaAction } from "@/lib/gestion";

const input = "w-full rounded border border-slate-300 px-3 py-2 text-sm";

export default function CambiarPasswordForm() {
  const [state, formAction, pending] = useActionState(cambiarPasswordPropiaAction, undefined);
  return (
    <form action={formAction} className="space-y-3">
      <input type="password" name="actual" placeholder="Contraseña actual" required autoComplete="current-password" className={input} />
      <input type="password" name="nueva" placeholder="Nueva contraseña (mín. 8)" required minLength={8} autoComplete="new-password" className={input} />
      <input type="password" name="confirmar" placeholder="Repite la nueva contraseña" required minLength={8} autoComplete="new-password" className={input} />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
