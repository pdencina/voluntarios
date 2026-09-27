import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedePostular } from "@/lib/constants";
import NuevaForm from "./NuevaForm";

export default async function NuevaPostulacionPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!puedePostular(user.rol)) redirect("/");

  const equipos = await prisma.equipo.findMany({
    orderBy: [{ tipo: "asc" }, { nombre: "asc" }],
    select: { id: true, nombre: true },
  });

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/ingreso-voluntariado" className="text-sm text-slate-500 hover:underline">
          ← Ingreso Voluntariado
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900">Nuevo ingreso</h1>
        <p className="text-sm text-slate-500">
          Datos de la persona que un líder recomienda para sumarse al voluntariado.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
        <NuevaForm equipos={equipos} />
      </div>
    </div>
  );
}
