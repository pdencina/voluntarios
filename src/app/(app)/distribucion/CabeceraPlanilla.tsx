"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { guardarCabeceraAction } from "@/lib/distribucion-actions";
import { toast } from "@/components/toast";

type Props = {
  semanaId: string;
  fecha: string;
  horario: string;
  pastores: string;
  administradoresCampus: string;
  lideresVoluntarios: string;
  editable: boolean;
};

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export default function CabeceraPlanilla(p: Props) {
  const [editando, setEditando] = useState(false);

  const filas: [string, string][] = [
    ["Pastores:", p.pastores],
    ["Administradores de Campus:", p.administradoresCampus],
    ["Líderes de Voluntarios:", p.lideresVoluntarios],
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 bg-slate-100 px-5 py-4">
        <div>
          <h2 className="text-xl font-extrabold uppercase tracking-tight text-slate-900 sm:text-2xl">
            Voluntarios Campus Puente Alto
          </h2>
          <p className="text-sm text-slate-600">Campus Puente Alto</p>
        </div>
        {p.editable && !editando && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar cabecera
          </button>
        )}
      </div>

      {editando ? (
        <form
          action={async (fd) => {
            await guardarCabeceraAction(fd);
            toast("Cabecera guardada.");
            setEditando(false);
          }}
          className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3"
        >
          <input type="hidden" name="semanaId" value={p.semanaId} />
          <label className="text-xs font-semibold text-slate-600">
            Pastores
            <input name="pastores" defaultValue={p.pastores} className={`${input} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Administradores de Campus
            <input name="administradoresCampus" defaultValue={p.administradoresCampus} className={`${input} mt-1`} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Líderes de Voluntarios
            <input name="lideresVoluntarios" defaultValue={p.lideresVoluntarios} className={`${input} mt-1`} />
          </label>
          <div className="flex gap-2 sm:col-span-3">
            <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Guardar</button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
          <p className="text-xs text-slate-500 sm:col-span-3">
            Estos datos quedan para toda la semana y se copian a la semana siguiente hasta que los cambies.
          </p>
        </form>
      ) : (
        <dl className="grid grid-cols-1 gap-x-8 gap-y-1.5 px-5 py-4 text-sm sm:grid-cols-2">
          <div className="flex gap-3">
            <dt className="w-44 shrink-0 text-right font-semibold text-slate-900">Fecha:</dt>
            <dd className="font-bold text-slate-900">{p.fecha}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-44 shrink-0 text-right font-semibold text-slate-900">Horario:</dt>
            <dd className="text-slate-800">{p.horario}</dd>
          </div>
          {filas.map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <dt className="w-44 shrink-0 text-right font-semibold text-slate-900">{k}</dt>
              <dd className="text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
