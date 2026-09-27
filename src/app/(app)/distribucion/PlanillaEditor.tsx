"use client";

import { useMemo, useState, useTransition } from "react";
import { Lock, Pencil, Plus, X } from "lucide-react";
import { asignarManualAction, guardarEncargadoAction } from "@/lib/distribucion-actions";
import { toast } from "@/components/toast";

export type SlotVM = {
  slot: number;
  voluntarioId: string | null;
  nombre: string | null;
  fija: boolean;
  llego: boolean;
  motivos: string[];
};
export type PuestoVM = {
  id: string;
  nombre: string;
  cupos: number;
  genero: string | null;
  rota: boolean;
  elegibles: string[];
  general: boolean;
  editable: boolean;
  slots: SlotVM[];
};
export type AreaVM = {
  id: string;
  nombre: string;
  encargado: string | null;
  encargadoEditable: boolean;
  color: string;
  puestos: PuestoVM[];
};
export type Candidato = {
  id: string;
  nombre: string;
  equipoIds: string[];
  genero: string | null;
  enPuesto: string | null;
};

function EncargadoInline({
  area,
  semanaId,
  encuentro,
}: {
  area: AreaVM;
  semanaId: string;
  encuentro: string;
}) {
  const [editando, setEditando] = useState(false);
  if (editando) {
    return (
      <form
        action={async (fd) => {
          await guardarEncargadoAction(fd);
          toast("Encargado actualizado.");
          setEditando(false);
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input type="hidden" name="semanaId" value={semanaId} />
        <input type="hidden" name="encuentro" value={encuentro} />
        <input type="hidden" name="areaId" value={area.id} />
        <input
          name="texto"
          autoFocus
          defaultValue={area.encargado ?? ""}
          placeholder="Quién lidera esta área"
          className="w-56 rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-brand-500"
        />
        <button className="rounded bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">Guardar</button>
        <button type="button" onClick={() => setEditando(false)} className="text-xs text-slate-500 hover:underline">
          Cancelar
        </button>
      </form>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <span className="font-semibold">ENCARGADO DE ÁREA:</span> {area.encargado ?? "—"}
      {area.encargadoEditable && (
        <button
          type="button"
          onClick={() => setEditando(true)}
          title="Cambiar el encargado de este encuentro"
          className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export default function PlanillaEditor({
  areas,
  candidatos,
  semanaId,
  encuentro,
}: {
  areas: AreaVM[];
  candidatos: Candidato[];
  semanaId: string;
  encuentro: string;
}) {
  const [abierto, setAbierto] = useState<{ puesto: PuestoVM; slot: SlotVM } | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, iniciar] = useTransition();

  const lista = useMemo(() => {
    if (!abierto) return { propios: [], apoyo: [] as Candidato[] };
    const { puesto } = abierto;
    const t = q.trim().toLowerCase();
    const filtrados = candidatos.filter(
      (c) => (!t || c.nombre.toLowerCase().includes(t)) && (!puesto.genero || c.genero === puesto.genero)
    );
    const propios = filtrados.filter((c) => c.equipoIds.some((e) => puesto.elegibles.includes(e)));
    const apoyo = filtrados.filter((c) => !propios.includes(c));
    return { propios, apoyo };
  }, [abierto, candidatos, q]);

  function enviar(voluntarioId: string) {
    if (!abierto) return;
    const fd = new FormData();
    fd.set("semanaId", semanaId);
    fd.set("encuentro", encuentro);
    fd.set("puestoId", abierto.puesto.id);
    fd.set("slot", String(abierto.slot.slot));
    fd.set("voluntarioId", voluntarioId);
    setError(null);
    iniciar(async () => {
      const r = await asignarManualAction(fd);
      if (r?.error) setError(r.error);
      else {
        toast(r?.ok ?? "Listo.");
        setAbierto(null);
        setQ("");
      }
    });
  }

  const fila = (c: Candidato) => (
    <li key={c.id}>
      <button
        type="button"
        disabled={pending || !!c.enPuesto}
        onClick={() => enviar(c.id)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="text-slate-900">{c.nombre}</span>
        {c.enPuesto && <span className="text-xs text-slate-500">ya en {c.enPuesto}</span>}
      </button>
    </li>
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {areas.map((a) => (
          <div key={a.id} className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className={`${a.color} px-4 py-2.5 text-sm font-bold tracking-wide text-white`}>{a.nombre}</div>
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-xs text-slate-600">
              <EncargadoInline area={a} semanaId={semanaId} encuentro={encuentro} />
            </div>
            <ul className="divide-y divide-slate-100">
              {a.puestos.map((p) => (
                <li key={p.id} className="flex flex-wrap items-start gap-3 px-4 py-2.5">
                  <div className="w-44 shrink-0 text-sm font-medium text-slate-800">
                    {p.nombre}
                    {p.genero && (
                      <span className="ml-1 rounded bg-accent-200 px-1 text-[10px] font-semibold text-brand-700">
                        {p.genero === "F" ? "Mujeres" : "Hombres"}
                      </span>
                    )}
                    {!p.rota && (
                      <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-500">fijo</span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-wrap gap-2">
                    {p.slots.map((s) =>
                      s.nombre ? (
                        <button
                          key={s.slot}
                          type="button"
                          disabled={!p.editable}
                          title={s.motivos.join(" · ")}
                          onClick={() => p.editable && setAbierto({ puesto: p, slot: s })}
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm ${
                            s.motivos.some((m) => m.startsWith("⚠"))
                              ? "border-amber-300 bg-amber-50 text-amber-900"
                              : "border-sage-500/30 bg-sage-500/10 text-slate-900"
                          }`}
                        >
                          {s.fija && <Lock className="h-3 w-3 text-slate-500" />}
                          {s.llego && (
                            <span title="Llegó" className="rounded-full bg-sage-600 px-1 text-[10px] font-bold leading-4 text-white">
                              ✓
                            </span>
                          )}
                          {s.nombre}
                        </button>
                      ) : p.editable ? (
                        <button
                          key={s.slot}
                          type="button"
                          onClick={() => setAbierto({ puesto: p, slot: s })}
                          className="flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-sm text-slate-400 hover:border-brand-400 hover:text-brand-700"
                        >
                          <Plus className="h-3.5 w-3.5" /> Vacío
                        </button>
                      ) : (
                        <span key={s.slot} className="rounded-lg border border-dashed border-slate-200 px-2.5 py-1 text-sm text-slate-300">
                          Vacío
                        </span>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => setAbierto(null)}>
          <div
            className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Asignar a</p>
                <p className="font-semibold text-slate-900">{abierto.puesto.nombre}</p>
              </div>
              <button type="button" onClick={() => setAbierto(null)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-3">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar voluntario disponible…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {lista.propios.length > 0 && (
                <>
                  <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase text-slate-400">Del equipo del área</p>
                  <ul>{lista.propios.map(fila)}</ul>
                </>
              )}
              {lista.apoyo.length > 0 && (
                <>
                  <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase text-slate-400">Otros disponibles (apoyo)</p>
                  <ul>{lista.apoyo.map(fila)}</ul>
                </>
              )}
              {lista.propios.length + lista.apoyo.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-slate-400">
                  No hay voluntarios disponibles que coincidan.
                </p>
              )}
            </div>
            {abierto.slot.nombre && (
              <div className="border-t border-slate-100 p-3">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => enviar("")}
                  className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Quitar a {abierto.slot.nombre}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
