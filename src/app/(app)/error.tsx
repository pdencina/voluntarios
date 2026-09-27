"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function ErrorApp({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-200 text-brand-700">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-xl font-bold text-brand-900">No se pudo completar la acción</h1>
      <p className="mt-2 text-sm text-slate-600">
        Puede ser un problema de conexión o una acción que tu rol no permite. Intenta de nuevo; si se repite,
        avisa al administrador{error.digest ? ` indicando el código ${error.digest}` : ""}.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Reintentar
        </button>
        <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Ir al panel
        </Link>
      </div>
    </div>
  );
}
