"use client";

import { Printer } from "lucide-react";

export default function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
    >
      <Printer className="h-4 w-4" /> Imprimir / guardar PDF
    </button>
  );
}
