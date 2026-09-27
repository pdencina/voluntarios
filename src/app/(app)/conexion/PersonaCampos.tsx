"use client";

import { CATEGORIAS, ENCUENTROS, ORIGENES } from "@/lib/conexion";

export type ValoresPersona = {
  nombre: string;
  telefono: string;
  campus: string;
  fechaLlegada: string;
  encuentro: string;
  categoria: string;
  origen: string;
  atendidaPor: string;
  observaciones: string;
};

const input =
  "w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";
const label = "mb-1 block text-sm font-medium text-slate-700";

export default function PersonaCampos({
  v,
  cambiar,
}: {
  v: ValoresPersona;
  cambiar: (campo: keyof ValoresPersona, valor: string) => void;
}) {
  const campo = (k: keyof ValoresPersona) => ({
    name: k,
    value: v[k],
    onChange: (e: { target: { value: string } }) => cambiar(k, e.target.value),
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Nombre *</label>
          <input required {...campo("nombre")} className={input} autoComplete="off" />
        </div>
        <div>
          <label className={label}>Teléfono / WhatsApp</label>
          <input {...campo("telefono")} inputMode="tel" placeholder="9 1234 5678" className={input} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className={label}>Fecha *</label>
          <input type="date" required {...campo("fechaLlegada")} className={input} />
        </div>
        <div>
          <label className={label}>Encuentro *</label>
          <select required {...campo("encuentro")} className={input}>
            {ENCUENTROS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.largo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Persona *</label>
          <select required {...campo("categoria")} className={input}>
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Cómo llegó *</label>
          <select required {...campo("origen")} className={input}>
            {ORIGENES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={label}>Campus</label>
          <input {...campo("campus")} className={input} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Atendida por</label>
          <input {...campo("atendidaPor")} placeholder="Quien la recibió en el patio" className={input} />
        </div>
      </div>
      <div>
        <label className={label}>Observaciones</label>
        <textarea rows={2} {...campo("observaciones")} className={input} />
      </div>
    </div>
  );
}
