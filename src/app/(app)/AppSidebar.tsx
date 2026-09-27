"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarCheck,
  DatabaseBackup,
  GitMerge,
  LayoutGrid,
  MapPinCheck,
  Handshake,
  HeartHandshake,
  Layers,
  LayoutDashboard,
  Radio,
  LogOut,
  Menu,
  ScrollText,
  Search,
  UserCog,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/lib/actions";
import BuscadorGlobal, { EVENTO_ABRIR_BUSCADOR } from "@/components/BuscadorGlobal";

const ICONOS: Record<string, LucideIcon> = {
  panel: LayoutDashboard,
  equipos: Layers,
  voluntarios: Users,
  convocatorias: CalendarCheck,
  envivo: Radio,
  distribucion: LayoutGrid,
  asistencia: MapPinCheck,
  ingreso: UserPlus,
  bienvenida: HeartHandshake,
  conexion: Handshake,
  usuarios: UserCog,
  duplicados: GitMerge,
  auditoria: ScrollText,
  respaldos: DatabaseBackup,
};

export type ItemMenu = { href: string; label: string; icono: keyof typeof ICONOS };
export type GrupoMenu = { titulo: string; items: ItemMenu[] };

type Props = {
  grupos: GrupoMenu[];
  nombre: string;
  rol: string;
  pendientes: Record<string, number>;
};

function Contenido({ grupos, nombre, rol, pendientes, alNavegar }: Props & { alNavegar?: () => void }) {
  const pathname = usePathname();
  const mejor = grupos
    .flatMap((g) => g.items.map((i) => i.href))
    .filter((h) => (h === "/" ? pathname === "/" : pathname.startsWith(h)))
    .sort((a, b) => b.length - a.length)[0];
  const activo = (href: string) => href === mejor;
  const inicial = nombre.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex h-full flex-col text-brand-100">
      <div className="flex items-center gap-3 px-5 py-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-300 to-accent-400 text-brand-900 shadow-lg shadow-accent-500/20">
          <HeartHandshake className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="text-base font-bold text-white">Voluntarios CPA</p>
          <p className="text-xs text-brand-300">Administración de equipos</p>
        </div>
      </div>

      <div className="px-3 pb-4">
        <button
          type="button"
          onClick={() => {
            alNavegar?.();
            window.dispatchEvent(new Event(EVENTO_ABRIR_BUSCADOR));
          }}
          className="flex w-full items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-brand-200 hover:bg-white/15 hover:text-white"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Buscar…</span>
          <kbd className="hidden rounded border border-white/20 px-1.5 text-[10px] text-brand-300 lg:inline">Ctrl K</kbd>
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {grupos.map((g) => (
          <div key={g.titulo}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-brand-400">
              {g.titulo}
            </p>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const Icono = ICONOS[it.icono];
                const on = activo(it.href);
                const n = pendientes[it.href] ?? 0;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={alNavegar}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                        on
                          ? "bg-white/15 font-medium text-white shadow-inner"
                          : "text-brand-200 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icono className={`h-[18px] w-[18px] ${on ? "text-accent-300" : "text-brand-300 group-hover:text-accent-200"}`} />
                      <span className="flex-1 truncate">{it.label}</span>
                      {n > 0 && (
                        <span className="rounded-full bg-accent-300 px-1.5 py-0.5 text-[11px] font-bold text-brand-900">
                          {n}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href="/cuenta"
          onClick={alNavegar}
          className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/10"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
            {inicial}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-medium text-white">{nombre}</span>
            <span className="block text-xs text-brand-300">{rol}</span>
          </span>
        </Link>
        <form action={logoutAction}>
          <button className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-brand-200 hover:bg-white/10 hover:text-white">
            <LogOut className="h-[18px] w-[18px]" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}

const FONDO = "bg-gradient-to-b from-brand-600 via-brand-600 to-brand-700";

export default function AppSidebar(props: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <BuscadorGlobal paginas={props.grupos.flatMap((g) => g.items.map((i) => ({ href: i.href, label: i.label })))} />
      {/* Escritorio */}
      <aside className={`sticky top-0 hidden h-screen w-64 shrink-0 lg:block print:hidden ${FONDO}`}>
        <Contenido {...props} />
      </aside>

      {/* Móvil: barra superior + cajón */}
      <header className={`sticky top-0 z-30 flex items-center justify-between px-4 py-3 text-white lg:hidden print:hidden ${FONDO}`}>
        <div className="flex items-center gap-2 font-bold">
          <HeartHandshake className="h-5 w-5 text-accent-300" />
          Voluntarios CPA
        </div>
        <button
          type="button"
          aria-label="Buscar"
          onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_BUSCADOR))}
          className="ml-auto mr-1 rounded-lg p-2 hover:bg-white/10"
        >
          <Search className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setAbierto(true)}
          className="rounded-lg p-2 hover:bg-white/10"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {abierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAbierto(false)} />
          <div className={`absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-2xl ${FONDO}`}>
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setAbierto(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-brand-200 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            <Contenido {...props} alNavegar={() => setAbierto(false)} />
          </div>
        </div>
      )}
    </>
  );
}
