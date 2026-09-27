"use client";

import { useTransition } from "react";
import { toast } from "@/components/toast";

type Props = {
  /** Server Action que no redirige (las que redirigen se usan con un <form> normal). */
  action: (fd: FormData) => Promise<unknown>;
  exito: string;
  className?: string;
  children: React.ReactNode;
};

/** Formulario que ejecuta una Server Action y confirma el resultado con un aviso. */
export default function FormAccion({ action, exito, className, children }: Props) {
  const [pending, iniciar] = useTransition();
  return (
    <form
      className={className}
      aria-busy={pending}
      action={(fd) =>
        iniciar(async () => {
          try {
            const r = (await action(fd)) as { error?: string; ok?: string } | undefined;
            if (r?.error) toast(r.error, "error");
            else toast(r?.ok ?? exito);
          } catch {
            toast("No se pudo completar la acción. Intenta de nuevo.", "error");
          }
        })
      }
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
