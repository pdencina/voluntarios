"use client";

import { useActionState, useMemo, useState } from "react";
import { crearUsuarioAction, actualizarUsuarioAction } from "@/lib/gestion";
import { normalizarNombre } from "@/lib/normalize";
import { ROLES, veTodo } from "@/lib/constants";

export type VoluntarioBusqueda = {
  id: string;
  nombre: string;
  correo: string | null;
  equipoIds: string[];
  equipos: string;
};

type Props = {
  equipos: { id: string; nombre: string }[];
  voluntarios?: VoluntarioBusqueda[];
  emailsConUsuario?: string[];
  usuario?: { id: string; nombre: string; email: string; rol: string; equipoIds: string[] };
};

const input = "w-full rounded border border-slate-300 px-3 py-2 text-sm";

function generarPassword() {
  const abc = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
}

export default function NuevoUsuarioForm({
  equipos,
  voluntarios = [],
  emailsConUsuario = [],
  usuario,
}: Props) {
  const [state, formAction, pending] = useActionState(
    usuario ? actualizarUsuarioAction : crearUsuarioAction,
    undefined
  );

  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [rol, setRol] = useState(usuario?.rol ?? "LIDER");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [equipoIds, setEquipoIds] = useState<string[]>(usuario?.equipoIds ?? []);
  const [elegido, setElegido] = useState<VoluntarioBusqueda | null>(null);
  const [entregada, setEntregada] = useState<{ email: string; password: string } | null>(null);

  const yaTienen = useMemo(() => new Set(emailsConUsuario), [emailsConUsuario]);

  const resultados = useMemo(() => {
    const q = normalizarNombre(busqueda);
    if (q.length < 2) return [];
    return voluntarios
      .filter((v) => normalizarNombre(v.nombre).includes(q))
      .slice(0, 8);
  }, [busqueda, voluntarios]);

  const [ultimoEstado, setUltimoEstado] = useState(state);
  if (state !== ultimoEstado) {
    setUltimoEstado(state);
    if (state?.ok) {
      setEntregada({ email, password });
      setBusqueda("");
      setNombre("");
      setEmail("");
      setPassword("");
      setRol("LIDER");
      setEquipoIds([]);
      setElegido(null);
    }
  }

  function elegir(v: VoluntarioBusqueda) {
    setElegido(v);
    setNombre(v.nombre);
    setEmail(v.correo ?? "");
    setEquipoIds(v.equipoIds);
    setBusqueda("");
    setAbierto(false);
  }

  function alternarEquipo(id: string) {
    setEquipoIds((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  }

  return (
    <form action={formAction} className="space-y-4">
      {usuario && <input type="hidden" name="id" value={usuario.id} />}

      {!usuario && (
        <div className="relative">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Buscar entre los voluntarios
          </label>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setAbierto(true);
            }}
            onFocus={() => setAbierto(true)}
            placeholder="Escribe un nombre, ej. Pablo…"
            autoComplete="off"
            className={input}
          />
          {abierto && busqueda.trim().length >= 2 && (
            <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded border border-slate-200 bg-white shadow-lg">
              {resultados.map((v) => {
                const tiene = !!v.correo && yaTienen.has(v.correo.toLowerCase());
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => elegir(v)}
                      className="block w-full px-3 py-2 text-left hover:bg-brand-50/60"
                    >
                      <span className="text-sm font-medium text-slate-900">{v.nombre}</span>
                      {tiene && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          ya tiene usuario
                        </span>
                      )}
                      <span className="block text-xs text-slate-500">
                        {[v.equipos, v.correo].filter(Boolean).join(" · ") || "Sin datos"}
                      </span>
                    </button>
                  </li>
                );
              })}
              {resultados.length === 0 && (
                <li className="px-3 py-2 text-sm text-slate-400">
                  Sin coincidencias. Puedes completar los datos a mano abajo.
                </li>
              )}
            </ul>
          )}
          {elegido && (
            <p className="mt-1 text-xs text-emerald-700">
              Seleccionado: {elegido.nombre}. Sus datos y equipos se completaron abajo.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
          <input
            name="nombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Correo (para ingresar)</label>
          <input
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!!usuario}
            className={`${input} disabled:bg-slate-100`}
          />
          {!usuario && elegido && !elegido.correo && (
            <p className="mt-1 text-xs text-amber-700">Este voluntario no tiene correo registrado; escríbelo.</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {usuario ? "Nueva contraseña (opcional)" : "Contraseña"}
          </label>
          <div className="flex gap-2">
            <input
              type={verPassword ? "text" : "password"}
              name="password"
              required={!usuario}
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
            />
            <button
              type="button"
              onClick={() => {
                setPassword(generarPassword());
                setVerPassword(true);
              }}
              className="whitespace-nowrap rounded border border-slate-300 px-3 text-xs text-slate-700 hover:bg-slate-100"
            >
              Generar
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Mínimo 8 caracteres. Anótala para entregarla; la persona puede cambiarla en “Mi cuenta”.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Rol</label>
          <select
            name="rol"
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            className={input}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label} ({r.detalle})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">
          Equipos que puede ver {veTodo(rol) && <span className="text-slate-400">(este rol ve todos los equipos)</span>}
        </p>
        <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded border border-slate-200 p-2 sm:grid-cols-3">
          {equipos.map((eq) => (
            <label key={eq.id} className="flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                name="equipoIds"
                value={eq.id}
                checked={equipoIds.includes(eq.id)}
                onChange={() => alternarEquipo(eq.id)}
              />
              {eq.nombre}
            </label>
          ))}
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && (
        <div className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <p>{state.ok}</p>
          {entregada && (
            <p className="mt-1">
              Entrega estas credenciales ahora (la contraseña no se vuelve a mostrar):{" "}
              <strong>{entregada.email}</strong> · <strong className="font-mono">{entregada.password}</strong>
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Guardando…" : usuario ? "Guardar cambios" : "Crear usuario"}
      </button>
    </form>
  );
}
