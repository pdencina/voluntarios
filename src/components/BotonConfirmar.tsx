"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

type Props = {
  children: React.ReactNode;
  className?: string;
  titulo: string;
  mensaje: React.ReactNode;
  textoConfirmar?: string;
  /** Rojo para acciones que borran datos; neutro para acciones reversibles. */
  peligro?: boolean;
  disabled?: boolean;
};

/** Botón que pide confirmación antes de enviar el formulario que lo contiene. */
export default function BotonConfirmar({
  children,
  className,
  titulo,
  mensaje,
  textoConfirmar = "Eliminar",
  peligro = true,
  disabled,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const cancelar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    cancelar.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [abierto]);

  return (
    <>
      <button ref={boton} type="button" disabled={disabled} className={className} onClick={() => setAbierto(true)}>
        {children}
      </button>
      {abierto &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center"
            onClick={() => setAbierto(false)}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirmar-titulo"
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex gap-4">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    peligro ? "bg-red-100 text-red-600" : "bg-accent-200 text-brand-700"
                  }`}
                >
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <h2 id="confirmar-titulo" className="font-semibold text-slate-900">
                    {titulo}
                  </h2>
                  <div className="mt-1 text-sm text-slate-600">{mensaje}</div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  ref={cancelar}
                  type="button"
                  onClick={() => setAbierto(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAbierto(false);
                    boton.current?.closest("form")?.requestSubmit();
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                    peligro ? "bg-red-600 hover:bg-red-700" : "bg-brand-600 hover:bg-brand-700"
                  }`}
                >
                  {textoConfirmar}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
