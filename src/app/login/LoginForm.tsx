"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions";

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export default function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Correo</label>
        <input type="email" name="email" required autoComplete="username" className={input} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
        <input type="password" name="password" required autoComplete="current-password" className={input} />
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
