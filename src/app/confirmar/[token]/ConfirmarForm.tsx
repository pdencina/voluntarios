"use client";

import { useActionState } from "react";
import { responderConvocatoriaAction } from "@/lib/actions";
import { FRANJAS } from "@/lib/constants";

type Props = {
  token: string;
  respuesta: {
    disponibleJueves: boolean | null;
    disponibleDomingoAM: boolean | null;
    disponibleDomingoPM: boolean | null;
  };
};

export default function ConfirmarForm({ token, respuesta }: Props) {
  const [state, formAction, pending] = useActionState(
    responderConvocatoriaAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      {FRANJAS.map((f) => {
        const actual = respuesta[f.key];
        return (
          <fieldset key={f.key} className="space-y-1">
            <legend className="text-sm font-medium text-slate-700">{f.label}</legend>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name={f.key}
                  value="si"
                  defaultChecked={actual === true}
                  required
                />
                Disponible
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name={f.key}
                  value="no"
                  defaultChecked={actual === false}
                />
                No disponible
              </label>
            </div>
          </fieldset>
        );
      })}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Confirmar disponibilidad"}
      </button>
    </form>
  );
}
