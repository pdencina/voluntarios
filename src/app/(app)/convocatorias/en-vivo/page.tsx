import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { CheckCircle2, Radio } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { equiposVisiblesPara, voluntariosPorEquipo } from "@/lib/queries";
import { FRANJAS, veTodo } from "@/lib/constants";
import { enlaceReunion } from "@/lib/reunion";
import { abrirSemanaEnReunionAction } from "@/lib/reunion-actions";
import CopyLinkButton from "../[id]/CopyLinkButton";
import AutoRefresh from "./AutoRefresh";

const fmtSemana = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const CORTO = ["Jue", "Dom 11", "Dom 6"];

async function baseUrl() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

function Barra({ valor, total, alto = "h-3" }: { valor: number; total: number; alto?: string }) {
  const pct = total ? Math.round((valor / total) * 100) : 0;
  return (
    <div className={`${alto} w-full overflow-hidden rounded-full bg-slate-100`}>
      <div className={`${alto} rounded-full bg-sage-500 transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function EnVivoPage({
  searchParams,
}: {
  searchParams: Promise<{ equipo?: string }>;
}) {
  const { equipo: equipoParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;

  const [semana, equipos] = await Promise.all([
    prisma.semanaServicio.findFirst({ where: { abierta: true }, orderBy: { fechaLunes: "desc" } }),
    equiposVisiblesPara(user),
  ]);

  const equipoElegido =
    equipos.find((e) => e.id === equipoParam) ??
    (!veTodo(user.rol) && equipos.length === 1 ? equipos[0] : null);

  if (!semana) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
        <Radio className="mx-auto h-10 w-10 text-brand-400" />
        <h1 className="text-xl font-bold text-brand-900">No hay una convocatoria abierta</h1>
        <p className="text-sm text-slate-500">
          Ábrela ahora para la próxima semana y hazla en vivo con tu equipo.
        </p>
        <form action={abrirSemanaEnReunionAction}>
          <input type="hidden" name="equipo" value={equipoElegido?.id ?? ""} />
          <button className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            Abrir convocatoria de la próxima semana
          </button>
        </form>
      </div>
    );
  }

  // Datos por equipo
  const lista = equipoElegido ? [equipoElegido] : equipos;
  const porEquipo = await voluntariosPorEquipo(lista.map((e) => e.id), semana.id);
  const datos = lista.map((equipo) => {
      const voluntarios = porEquipo.get(equipo.id) ?? [];
      const filas = voluntarios.map((v) => ({
        id: v.id,
        nombre: v.nombre,
        r: v.respuestas[0] ?? null,
        respondio: !!v.respuestas[0]?.respondidoAt,
      }));
      return {
        equipo,
        filas,
        total: filas.length,
        respondieron: filas.filter((f) => f.respondio).length,
        disponibles: FRANJAS.map((fr) => filas.filter((f) => f.r?.[fr.key] === true).length),
      };
    });

  const encabezado = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Link href="/convocatorias" className="text-sm text-slate-500 hover:underline">
          ← Convocatorias
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900">
          Convocatoria en vivo{equipoElegido ? ` · ${equipoElegido.nombre}` : ""}
        </h1>
        <p className="text-sm text-slate-500">Semana de servicio del {fmtSemana.format(semana.fechaLunes)}</p>
      </div>
      <AutoRefresh />
    </div>
  );

  // ---------- Vista de un equipo (reunión) ----------
  if (equipoElegido) {
    const d = datos[0];
    const origin = await baseUrl();
    const enlace = enlaceReunion(origin, semana.id, equipoElegido.id);
    const qr = await QRCode.toDataURL(enlace, {
      margin: 1,
      width: 320,
      color: { dark: "#1d1d1b", light: "#ffffff" },
    });

    return (
      <div className="space-y-6">
        {encabezado}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Código QR de la reunión" className="mx-auto h-56 w-56" />
            <p className="mt-3 text-sm font-semibold text-slate-900">Escanea y deja tu disponibilidad</p>
            <p className="mt-1 text-xs text-slate-500">Elige tu nombre y responde desde tu celular.</p>
            <div className="mt-3">
              <CopyLinkButton url={enlace} />
            </div>
          </div>

          <div className="space-y-5 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-end justify-between">
                <p className="text-sm text-slate-500">Han respondido</p>
                <p className="text-5xl font-bold text-slate-900">
                  {d.respondieron}
                  <span className="text-2xl font-normal text-slate-400"> / {d.total}</span>
                </p>
              </div>
              <div className="mt-3">
                <Barra valor={d.respondieron} total={d.total} alto="h-4" />
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {d.total - d.respondieron === 0
                  ? "¡Todo el equipo respondió! 🎉"
                  : `Faltan ${d.total - d.respondieron} por responder`}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {FRANJAS.map((f, i) => (
                <div key={f.key} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{f.label}</p>
                  <p className="mt-1 text-4xl font-bold text-sage-700">{d.disponibles[i]}</p>
                  <p className="text-xs text-slate-500">disponibles</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-900">Equipo</h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {d.filas.map((f) => (
              <li
                key={f.id}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors duration-500 ${
                  f.respondio ? "border-sage-500/40 bg-sage-500/10" : "border-slate-200 bg-slate-50"
                }`}
              >
                <span className="min-w-0">
                  <span className={`block truncate text-sm ${f.respondio ? "font-semibold text-slate-900" : "text-slate-500"}`}>
                    {f.nombre}
                  </span>
                  {f.respondio ? (
                    <span className="mt-0.5 flex gap-1.5 text-[11px]">
                      {FRANJAS.map((fr, i) => (
                        <span
                          key={fr.key}
                          className={f.r?.[fr.key] ? "font-medium text-sage-700" : "text-slate-400 line-through"}
                        >
                          {CORTO[i]}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Esperando respuesta…</span>
                  )}
                </span>
                {f.respondio && <CheckCircle2 className="h-5 w-5 shrink-0 text-sage-600" />}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // ---------- Vista general (todos los equipos que puedes ver) ----------
  const ordenados = [...datos].sort(
    (a, b) => b.respondieron / (b.total || 1) - a.respondieron / (a.total || 1)
  );
  const totalConv = new Set(datos.flatMap((d) => d.filas.map((f) => f.id)));
  const totalResp = new Set(datos.flatMap((d) => d.filas.filter((f) => f.respondio).map((f) => f.id)));

  return (
    <div className="space-y-6">
      {encabezado}

      <div className="rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-brand-200">Han respondido en total</p>
            <p className="text-6xl font-bold">
              {totalResp.size}
              <span className="text-3xl font-normal text-brand-300"> / {totalConv.size}</span>
            </p>
          </div>
          <div className="w-full sm:w-96">
            <div className="h-4 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-4 rounded-full bg-accent-300 transition-all duration-700"
                style={{ width: `${totalConv.size ? Math.round((totalResp.size / totalConv.size) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ordenados.map((d) => {
          const completo = d.total > 0 && d.respondieron === d.total;
          return (
            <Link
              key={d.equipo.id}
              href={`/convocatorias/en-vivo?equipo=${d.equipo.id}`}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                completo ? "border-sage-500/50" : "border-slate-200/80"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-slate-900">{d.equipo.nombre}</h2>
                {completo && <CheckCircle2 className="h-5 w-5 text-sage-600" />}
              </div>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {d.respondieron}
                <span className="text-lg font-normal text-slate-400"> / {d.total}</span>
              </p>
              <div className="mt-2">
                <Barra valor={d.respondieron} total={d.total} />
              </div>
              <div className="mt-3 flex gap-2 text-xs text-slate-600">
                {FRANJAS.map((f, i) => (
                  <span key={f.key} className="rounded-full bg-sage-500/10 px-2 py-0.5 text-sage-700">
                    <strong>{d.disponibles[i]}</strong> {CORTO[i]}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs font-medium text-brand-700">Abrir modo reunión →</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
