import Link from "next/link";
import { redirect } from "next/navigation";
import { puedeEditar } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";
import { equiposGestionables } from "@/lib/equipos-editables";
import NuevoForm from "./NuevoForm";

export default async function NuevoVoluntarioPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!puedeEditar(user.rol)) redirect("/voluntarios");
  const equipos = await equiposGestionables(user);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/voluntarios" className="text-sm text-slate-500 hover:underline">
          ← Voluntarios
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900">Nuevo voluntario</h1>
      </div>
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
        <NuevoForm equipos={equipos} />
      </div>
    </div>
  );
}
