import { redirect } from "next/navigation";
import { esAdmin } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AuditoriaPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!esAdmin(user.rol)) redirect("/");

  const registros = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const fmt = new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Santiago",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">Registro de cambios</h1>
          <p className="text-sm text-slate-500">Últimas 200 acciones.</p>
        </div>
        <a
          href="/api/exportar"
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          Descargar respaldo (CSV)
        </a>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-brand-50 text-xs uppercase text-brand-700">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Usuario</th>
              <th className="px-4 py-2">Acción</th>
              <th className="px-4 py-2">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="whitespace-nowrap px-4 py-2 text-slate-600">{fmt.format(r.createdAt)}</td>
                <td className="px-4 py-2 text-slate-900">{r.usuarioNombre}</td>
                <td className="px-4 py-2 text-slate-600">{r.accion}</td>
                <td className="px-4 py-2 text-slate-600">{r.detalle}</td>
              </tr>
            ))}
            {registros.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Aún no hay registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
