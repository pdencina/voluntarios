import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEditar, veTodo } from "@/lib/constants";
import { equiposGestionables } from "@/lib/equipos-editables";
import EditarForm from "./EditarForm";

export default async function EditarVoluntarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = decodeURIComponent((await params).id);
  const user = await getCurrentUser();
  if (!user) return null;

  const v = await prisma.voluntario.findUnique({
    where: { id },
    include: { equipos: { select: { equipoId: true } } },
  });
  if (!v) notFound();

  const puede =
    veTodo(user.rol) || v.equipos.some((e) => user.equipoIds.includes(e.equipoId));
  if (!puede || !puedeEditar(user.rol)) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href={`/voluntarios/${v.id}`} className="text-sm text-slate-500 hover:underline">
          ← {v.nombre}
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900">Editar voluntario</h1>
      </div>
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
        <EditarForm
          voluntario={{
            id: v.id,
            nombre: v.nombre,
            telefono: v.telefono,
            correo: v.correo,
            fechaNacimiento: v.fechaNacimiento
              ? v.fechaNacimiento.toISOString().slice(0, 10)
              : "",
            fechaNacimientoRaw: v.fechaNacimientoRaw,
            observaciones: v.observaciones,
            genero: v.genero,
            equipoIds: v.equipos.map((e) => e.equipoId),
          }}
          equipos={await equiposGestionables(user)}
        />
      </div>
    </div>
  );
}
