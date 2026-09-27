import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { equiposVisiblesPara } from "@/lib/queries";
import { TIPO_EQUIPO, esAdmin } from "@/lib/constants";

export default async function EquiposPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const equipos = await equiposVisiblesPara(user);
  const ministerios = equipos.filter((e) => e.tipo === TIPO_EQUIPO.MINISTERIO);
  const rotativos = equipos.filter((e) => e.tipo === TIPO_EQUIPO.ROTATIVO);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">Equipos</h1>
          <p className="text-sm text-slate-500">
            Ministerios y equipos rotativos de servicio general.
          </p>
        </div>
        {esAdmin(user.rol) && (
          <Link
            href="/equipos/nuevo"
            className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Nuevo equipo
          </Link>
        )}
      </div>

      <Seccion titulo="Equipos rotativos (servicio general)" equipos={rotativos} />
      <Seccion titulo="Ministerios" equipos={ministerios} />
    </div>
  );
}

function Seccion({
  titulo,
  equipos,
}: {
  titulo: string;
  equipos: Awaited<ReturnType<typeof equiposVisiblesPara>>;
}) {
  if (equipos.length === 0) return null;
  return (
    <div>
      <h2 className="mb-3 font-semibold text-slate-900">{titulo}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {equipos.map((eq) => (
          <Link
            key={eq.id}
            href={`/equipos/${eq.id}`}
            className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-4 hover:border-slate-400"
          >
            <p className="font-medium text-slate-900">{eq.nombre}</p>
            <p className="mt-1 text-sm text-slate-500">
              {eq.liderNombre || "Sin líder asignado"}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {eq._count.voluntarios} voluntario{eq._count.voluntarios === 1 ? "" : "s"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
