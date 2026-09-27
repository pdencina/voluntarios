"use client";

import { useActionState } from "react";
import { responderEnReunionAction } from "@/lib/reunion-actions";
import { FRANJAS } from "@/lib/constants";

type Props = {
  semanaId: string;
  equipoId: string;
  firma: string;
  voluntarioId: string;
  respuesta: {
    disponibleJueves: boolean | null;
    disponibleDomingoAM: boolean | null;
    disponibleDomingoPM: boolean | null;
  };
};

export default function ReunionForm({ semanaId, equipoId, firma, voluntarioId, respuesta }: Props) {
  const [state, formAction, pending] = useActionState(responderEnReunionAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="semanaId" value={semanaId} />
      <input type="hidden" name="equipoId" value={equipoId} />
      <input type="hidden" name="f" value={firma} />
      <input type="hidden" name="voluntarioId" value={voluntarioId} />

      {FRANJAS.map((f) => {
        const actual = respuesta[f.key];
        return (
          <fieldset key={f.key}>
            <legend className="mb-1.5 text-sm font-semibold text-slate-800">{f.label}</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="cursor-pointer">
                <input type="radio" name={f.key} value="si" required defaultChecked={actual === true} className="peer sr-only" />
                <span className="block rounded-xl border border-slate-300 px-3 py-3 text-center text-sm font-medium text-slate-700 peer-checked:border-sage-600 peer-checked:bg-sage-600 peer-checked:text-white">
                  Sí, puedo
                </span>
              </label>
              <label className="cursor-pointer">
                <input type="radio" name={f.key} value="no" defaultChecked={actual === false} className="peer sr-only" />
                <span className="block rounded-xl border border-slate-300 px-3 py-3 text-center text-sm font-medium text-slate-700 peer-checked:border-brand-600 peer-checked:bg-brand-600 peer-checked:text-white">
                  No puedo
                </span>
              </label>
            </div>
          </fieldset>
        );
      })}

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <button
        disabled={pending}
        className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Confirmar disponibilidad"}
      </button>
    </form>
  );
}
