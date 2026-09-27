import { redirect } from "next/navigation";
import { esAdmin } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";
import EquipoForm from "../EquipoForm";

export default async function NuevoEquipoPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!esAdmin(user.rol)) redirect("/equipos");

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-brand-900">Nuevo equipo</h1>
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
        <EquipoForm />
      </div>
    </div>
  );
}
