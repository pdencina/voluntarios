"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Copy, MessageCircle } from "lucide-react";

export type Aviso = {
  id: string;
  nombre: string;
  telefono: string | null;
  resumen: string[];
  whatsapp: string | null;
  mensaje: string;
};

function leer(clave: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(clave) ?? "[]");
  } catch {
    return [];
  }
}

export default function ListaAvisos({ semanaId, avisos }: { semanaId: string; avisos: Aviso[] }) {
  const clave = `avisos-${semanaId}`;
  const [avisados, setAvisados] = useState<string[]>([]);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    // localStorage solo existe en el navegador; se lee al montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAvisados(leer(clave));
  }, [clave]);

  function marcar(id: string) {
    const nuevo = [...new Set([...avisados, id])];
    setAvisados(nuevo);
    try {
      localStorage.setItem(clave, JSON.stringify(nuevo));
    } catch {
      // modo privado: se pierde al recargar, no es grave
    }
  }

  const pendientes = avisos.filter((a) => !avisados.includes(a.id)).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm shadow-sm">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-sage-500 transition-all"
            style={{ width: `${avisos.length ? ((avisos.length - pendientes) / avisos.length) * 100 : 0}%` }}
          />
        </div>
        <span className="whitespace-nowrap text-slate-600">
          {avisos.length - pendientes} de {avisos.length} avisados
        </span>
      </div>

      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {avisos.map((a) => {
          const listo = avisados.includes(a.id);
          return (
            <li
              key={a.id}
              className={`rounded-xl border p-4 shadow-sm ${listo ? "border-sage-500/40 bg-sage-500/5" : "border-slate-200/80 bg-white"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-slate-900">
                    {listo && <CheckCircle2 className="h-4 w-4 text-sage-600" />}
                    {a.nombre}
                  </p>
                  <ul className="mt-1 space-y-0.5 text-sm text-slate-600">
                    {a.resumen.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {a.whatsapp ? (
                    <a
                      href={a.whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => marcar(a.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-sage-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sage-700"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  ) : (
                    <span className="text-xs text-amber-700">Sin teléfono</span>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(a.mensaje);
                        setCopiado(a.id);
                        marcar(a.id);
                        setTimeout(() => setCopiado(null), 1500);
                      } catch {
                        // portapapeles bloqueado
                      }
                    }}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                  >
                    <Copy className="h-3.5 w-3.5" /> {copiado === a.id ? "Copiado" : "Copiar mensaje"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
        {avisos.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 lg:col-span-2">
            Aún no hay puestos asignados esta semana. Genera la distribución primero.
          </li>
        )}
      </ul>
    </div>
  );
}
