"use client";

import { useState } from "react";

export default function CopyTextButton({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1800);
        } catch {
          // el navegador puede bloquear el portapapeles
        }
      }}
      className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
    >
      {copiado ? "Copiado ✓" : etiqueta}
    </button>
  );
}
