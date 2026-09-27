"use client";

import { useActionState, useState } from "react";
import { crearPersonaNuevaAction } from "@/lib/conexion-actions";
import PersonaCampos, { type ValoresPersona } from "./PersonaCampos";

export default function NuevaPersonaForm({
  hoy,
  encuentroSugerido,
  atendidaPor,
}: {
  hoy: string;
  encuentroSugerido: string;
  atendidaPor: string;
}) {
  const [state, formAction, pending] = useActionState(crearPersonaNuevaAction, undefined);
  const [v, setV] = useState<ValoresPersona>({
    nombre: "",
    telefono: "",
    campus: "CPA",
    fechaLlegada: hoy,
    encuentro: encuentroSugerido,
    categoria: "MUJER",
    origen: "AMIGOS_FAMILIA",
    atendidaPor,
    observaciones: "",
  });
  const [ultimo, setUltimo] = useState(state);
  if (state !== ultimo) {
    setUltimo(state);
    if (state?.ok) setV((p) => ({ ...p, nombre: "", telefono: "", observaciones: "" }));
  }

  return (
    <form action={formAction} className="space-y-4">
      <PersonaCampos v={v} cambiar={(k, val) => setV((p) => ({ ...p, [k]: val }))} />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>}
      <button
        disabled={pending}
        className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Registrar persona"}
      </button>
    </form>
  );
}
