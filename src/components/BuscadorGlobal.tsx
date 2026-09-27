"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, Layers, Loader2, Search, User } from "lucide-react";
import { buscarGlobalAction, type ResultadoBusqueda } from "@/lib/busqueda";
import { normalizarNombre } from "@/lib/normalize";

export const EVENTO_ABRIR_BUSCADOR = "abrir-buscador";

type Pagina = { href: string; label: string };
type Item = { key: string; titulo: string; detalle: string; href: string; tipo: "pagina" | ResultadoBusqueda["tipo"] };

export default function BuscadorGlobal({ paginas }: { paginas: Pagina[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const [remotos, setRemotos] = useState<ResultadoBusqueda[]>([]);
  const [activo, setActivo] = useState(0);
  const [buscando, iniciar] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAbierto((a) => !a);
      }
    };
    const abrir = () => setAbierto(true);
    window.addEventListener("keydown", tecla);
    window.addEventListener(EVENTO_ABRIR_BUSCADOR, abrir);
    return () => {
      window.removeEventListener("keydown", tecla);
      window.removeEventListener(EVENTO_ABRIR_BUSCADOR, abrir);
    };
  }, []);

  useEffect(() => {
    if (abierto) setTimeout(() => input.current?.focus(), 0);
  }, [abierto]);

  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 2) return;
    const t = setTimeout(() => {
      iniciar(async () => setRemotos(await buscarGlobalAction(texto)));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const items: Item[] = useMemo(() => {
    const n = normalizarNombre(q);
    const pags = paginas
      .filter((p) => !n || normalizarNombre(p.label).includes(n))
      .slice(0, n ? 4 : 8)
      .map((p) => ({ key: `p:${p.href}`, titulo: p.label, detalle: "Ir a la sección", href: p.href, tipo: "pagina" as const }));
    const rem = q.trim().length >= 2 ? remotos.map((r) => ({ key: `${r.tipo}:${r.id}`, ...r })) : [];
    return [...rem, ...pags];
  }, [q, remotos, paginas]);

  function cerrar() {
    setAbierto(false);
    setQ("");
    setRemotos([]);
    setActivo(0);
  }

  function ir(item: Item | undefined) {
    if (!item) return;
    cerrar();
    router.push(item.href);
  }

  if (!abierto) return null;

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-start justify-center bg-black/40 px-4 pt-[12vh]" onClick={cerrar}>
      <div
        role="dialog"
        aria-label="Buscar"
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          {buscando ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : <Search className="h-5 w-5 text-slate-400" />}
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActivo(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") cerrar();
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActivo((a) => Math.min(a + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActivo((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                ir(items[activo]);
              }
            }}
            placeholder="Buscar voluntario, equipo o sección…"
            className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400"
          />
          <kbd className="rounded border border-slate-200 px-1.5 text-xs text-slate-400">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {items.map((it, i) => {
            const Icono = it.tipo === "voluntario" ? User : it.tipo === "equipo" ? Layers : ArrowRight;
            return (
              <li key={it.key}>
                <button
                  type="button"
                  onMouseEnter={() => setActivo(i)}
                  onClick={() => ir(it)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${
                    i === activo ? "bg-brand-50" : "hover:bg-slate-50"
                  }`}
                >
                  <Icono className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{it.titulo}</span>
                    <span className="block truncate text-xs text-slate-500">{it.detalle}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {items.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-slate-400">
              {buscando ? "Buscando…" : "Sin resultados."}
            </li>
          )}
        </ul>
      </div>
    </div>,
    document.body
  );
}
