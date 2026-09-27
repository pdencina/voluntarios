"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

type Tipo = "ok" | "error";
type Toast = { id: number; texto: string; tipo: Tipo };

const oyentes = new Set<(t: Toast) => void>();
let siguiente = 1;

/** Muestra un aviso breve en la esquina (se puede llamar desde cualquier componente cliente). */
export function toast(texto: string, tipo: Tipo = "ok") {
  const t = { id: siguiente++, texto, tipo };
  oyentes.forEach((fn) => fn(t));
}

export function Toaster() {
  const [lista, setLista] = useState<Toast[]>([]);

  useEffect(() => {
    const agregar = (t: Toast) => {
      setLista((l) => [...l.slice(-3), t]);
      setTimeout(() => setLista((l) => l.filter((x) => x.id !== t.id)), 3500);
    };
    oyentes.add(agregar);
    return () => {
      oyentes.delete(agregar);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end print:hidden"
    >
      {lista.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ring-1 ${
            t.tipo === "ok" ? "bg-brand-700 text-white ring-brand-800" : "bg-red-600 text-white ring-red-700"
          }`}
        >
          {t.tipo === "ok" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-accent-300" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0" />
          )}
          <span className="flex-1">{t.texto}</span>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setLista((l) => l.filter((x) => x.id !== t.id))}
            className="rounded p-0.5 opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
