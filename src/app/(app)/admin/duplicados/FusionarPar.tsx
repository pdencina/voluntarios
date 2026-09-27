"use client";

import { useActionState, useState } from "react";
import { fusionarVoluntariosAction } from "@/lib/gestion";
import BotonConfirmar from "@/components/BotonConfirmar";

type V = { id: string; nombre: string; detalle: string };

export default function FusionarPar({ a, b }: { a: V; b: V }) {
  const [conservar, setConservar] = useState<"a" | "b">("a");
  const [state, formAction, pending] = useActionState(fusionarVoluntariosAction, undefined);
  const keep = conservar === "a" ? a : b;
  const drop = conservar === "a" ? b : a;

  return (
    <form action={formAction} className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-4">
      <input type="hidden" name="conservarId" value={keep.id} />
      <input type="hidden" name="eliminarId" value={drop.id} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {([["a", a], ["b", b]] as const).map(([k, v]) => (
          <label
            key={k}
            className={`cursor-pointer rounded border p-3 text-sm ${
              conservar === k ? "border-emerald-500 bg-emerald-50" : "border-slate-200"
            }`}
          >
            <input
              type="radio"
              className="mr-2"
              checked={conservar === k}
              onChange={() => setConservar(k)}
            />
            <span className="font-medium text-slate-900">{v.nombre}</span>
            <span className="mt-1 block text-xs text-slate-500">{v.detalle}</span>
          </label>
        ))}
      </div>
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Se conserva “{keep.nombre}” y se elimina “{drop.nombre}” uniendo sus equipos y respuestas.
        </p>
        <BotonConfirmar
          disabled={pending}
          className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          titulo="¿Fusionar estos voluntarios?"
          mensaje={<>“{drop.nombre}” se unirá a “{keep.nombre}” (equipos, datos y respuestas) y se eliminará. No se puede deshacer.</>}
          textoConfirmar="Fusionar"
        >
          {pending ? "Fusionando…" : "Fusionar"}
        </BotonConfirmar>
      </div>
    </form>
  );
}
