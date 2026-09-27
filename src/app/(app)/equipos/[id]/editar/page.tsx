import { notFound, redirect } from "next/navigation";
import { esAdmin } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EquipoForm from "../../EquipoForm";

export default async function EditarEquipoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  if (!esAdmin(user.rol)) redirect("/equipos");

  const equipo = await prisma.equipo.findUnique({ where: { id } });
  if (!equipo) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-brand-900">Editar equipo</h1>
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
        <EquipoForm
          equipo={{
            id: equipo.id,
            nombre: equipo.nombre,
            tipo: equipo.tipo,
            liderNombre: equipo.liderNombre,
            liderContacto: equipo.liderContacto,
          }}
        />
      </div>
    </div>
  );
}
