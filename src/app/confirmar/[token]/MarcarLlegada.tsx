"use client";

import { useActionState } from "react";
import { CheckCircle2, MapPinCheck } from "lucide-react";
import { marcarMiLlegadaAction } from "@/lib/asistencia-actions";

export default function MarcarLlegada({
  token,
  encuentro,
  etiqueta,
  yaLlego,
}: {
  token: string;
  encuentro: string;
  etiqueta: string;
  yaLlego: boolean;
}) {
  const [state, formAction, pending] = useActionState(marcarMiLlegadaAction, undefined);

  if (yaLlego || state?.ok) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-sage-500/10 px-4 py-3 text-sm font-medium text-sage-700">
        <CheckCircle2 className="h-5 w-5" /> {state?.ok ?? `Llegada registrada (${etiqueta}). ¡Gracias por servir hoy!`}
      </p>
    );
  }
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="encuentro" value={encuentro} />
      <button
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-sage-600 px-4 py-3 text-base font-semibold text-white shadow-md hover:bg-sage-700 disabled:opacity-60"
      >
        <MapPinCheck className="h-5 w-5" />
        {pending ? "Registrando…" : `Ya llegué · ${etiqueta}`}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
