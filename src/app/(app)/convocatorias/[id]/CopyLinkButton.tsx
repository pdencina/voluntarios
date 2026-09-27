"use client";

import { useState } from "react";

export default function CopyLinkButton({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1500);
        } catch {
          // ignore
        }
      }}
      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
    >
      {copiado ? "Copiado ✓" : "Copiar link"}
    </button>
  );
}
