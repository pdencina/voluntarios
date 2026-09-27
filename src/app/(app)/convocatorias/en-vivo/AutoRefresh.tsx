"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Maximize2 } from "lucide-react";

export default function AutoRefresh({ cadaMs = 3000 }: { cadaMs?: number }) {
  const router = useRouter();
  const [enVivo, setEnVivo] = useState(true);

  useEffect(() => {
    if (!enVivo) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, cadaMs);
    return () => clearInterval(t);
  }, [enVivo, cadaMs, router]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        type="button"
        onClick={() => setEnVivo((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50"
      >
        <span className={`h-2.5 w-2.5 rounded-full ${enVivo ? "animate-pulse bg-sage-500" : "bg-slate-400"}`} />
        {enVivo ? "En vivo" : "Pausado"}
      </button>
      <button
        type="button"
        onClick={() => document.documentElement.requestFullscreen?.()}
        className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50"
      >
        <Maximize2 className="h-4 w-4" />
        Pantalla completa
      </button>
    </div>
  );
}
