import { redirect } from "next/navigation";
import { Download, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { esAdmin } from "@/lib/constants";
import { listarRespaldos } from "@/lib/respaldo";
import { RESPALDOS_A_CONSERVAR } from "@/lib/respaldo-logica";
import CrearRespaldo from "./CrearRespaldo";

const fmt = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "America/Santiago",
});

async function leerRespaldos() {
  try {
    return { respaldos: await listarRespaldos(), error: false };
  } catch {
    return { respaldos: [], error: true };
  }
}

export default async function RespaldosPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!esAdmin(user.rol)) redirect("/");

  const { respaldos, error } = await leerRespaldos();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-900">Respaldos</h1>
        <p className="text-sm text-slate-500">
          Copia completa de la información en Excel: voluntarios, equipos, convocatorias, distribución, Conexión e ingresos.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-500/10 text-sage-700">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Respaldo automático cada lunes a las 6:00 AM</p>
            <p>Se guardan los últimos {RESPALDOS_A_CONSERVAR} en un almacenamiento privado. No incluyen contraseñas.</p>
          </div>
        </div>
        <CrearRespaldo />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-brand-50 text-xs uppercase text-brand-700">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Tamaño</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {respaldos.map((r) => (
              <tr key={r.pathname} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 text-slate-900 first-letter:uppercase">{fmt.format(r.uploadedAt)}</td>
                <td className="px-4 py-2 text-slate-600">{r.pathname.includes("automatico") ? "Automático" : "Manual"}</td>
                <td className="px-4 py-2 text-slate-600">{Math.max(1, Math.round(r.size / 1024))} KB</td>
                <td className="px-4 py-2 text-right">
                  <a
                    href={`/api/respaldos/descargar?path=${encodeURIComponent(r.pathname)}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
                  >
                    <Download className="h-4 w-4" /> Descargar
                  </a>
                </td>
              </tr>
            ))}
            {respaldos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  {error ? "No se pudo leer el almacenamiento de respaldos." : "Aún no hay respaldos. Crea el primero."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
