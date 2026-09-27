"use client";

import { useActionState, useMemo, useState } from "react";
import { CheckCircle2, HeartHandshake, Search } from "lucide-react";
import { registrarLlegadaQRAction } from "@/lib/asistencia-actions";
import { normalizarNombre } from "@/lib/normalize";

type Persona = { id: string; nombre: string; puesto: string | null };

export default function ListaLlegada({
  semanaId,
  encuentro,
  firma,
  personas,
  llegaron,
}: {
  semanaId: string;
  encuentro: string;
  firma: string;
  personas: Persona[];
  llegaron: string[];
}) {
  const [q, setQ] = useState("");
  const [elegido, setElegido] = useState<Persona | null>(null);
  const [state, formAction, pending] = useActionState(registrarLlegadaQRAction, undefined);
  const listos = useMemo(() => new Set(llegaron), [llegaron]);

  const filtrados = useMemo(() => {
    const t = normalizarNombre(q);
    return t ? personas.filter((p) => normalizarNombre(p.nombre).includes(t)) : personas;
  }, [personas, q]);

  if (state?.ok) {
    return (
      <div className="space-y-4 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage-500/15 text-sage-700">
          <HeartHandshake className="h-8 w-8" />
        </span>
        <p className="text-lg font-bold text-brand-900">{state.ok}</p>
        {elegido?.puesto && (
          <p className="text-sm text-slate-600">
            Tu puesto: <b>{elegido.puesto}</b>
          </p>
        )}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Siguiente persona
        </button>
      </div>
    );
  }

  if (elegido) {
    return (
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="semanaId" value={semanaId} />
        <input type="hidden" name="encuentro" value={encuentro} />
        <input type="hidden" name="f" value={firma} />
        <input type="hidden" name="voluntarioId" value={elegido.id} />
        <button type="button" onClick={() => setElegido(null)} className="text-sm text-slate-500 hover:underline">
          ← No soy yo
        </button>
        <p className="text-lg font-bold text-brand-900">{elegido.nombre}</p>
        {elegido.puesto && <p className="text-sm text-slate-600">Puesto de hoy: {elegido.puesto}</p>}
        {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        <button
          disabled={pending}
          className="w-full rounded-xl bg-sage-600 px-4 py-3 text-base font-semibold text-white hover:bg-sage-700 disabled:opacity-60"
        >
          {pending ? "Registrando…" : "Confirmar que llegué"}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Busca tu nombre y marca tu llegada.</p>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tu nombre…"
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
        />
      </div>
      <ul className="max-h-[55vh] space-y-2 overflow-y-auto">
        {filtrados.map((p) => {
          const listo = listos.has(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                disabled={listo}
                onClick={() => setElegido(p)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm ${
                  listo ? "border-sage-500/30 bg-sage-500/10 text-slate-600" : "border-slate-200 hover:border-brand-400"
                }`}
              >
                <span>
                  <span className="block font-medium text-slate-900">{p.nombre}</span>
                  {p.puesto && <span className="block text-xs text-slate-500">{p.puesto}</span>}
                </span>
                {listo && <CheckCircle2 className="h-5 w-5 text-sage-600" />}
              </button>
            </li>
          );
        })}
        {filtrados.length === 0 && (
          <li className="py-4 text-center text-sm text-slate-400">
            No aparece tu nombre. Avísale a tu líder para que registre tu llegada.
          </li>
        )}
      </ul>
    </div>
  );
}
