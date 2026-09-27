import Link from "next/link";
import { esAdmin } from "@/lib/constants";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NuevoUsuarioForm from "../NuevoUsuarioForm";

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  if (!esAdmin(user.rol)) redirect("/");

  const [u, equipos] = await Promise.all([
    prisma.usuario.findUnique({ where: { id }, include: { equipos: true } }),
    prisma.equipo.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);
  if (!u) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/usuarios" className="text-sm text-slate-500 hover:underline">
          ← Usuarios
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900">Editar usuario</h1>
      </div>
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
        <NuevoUsuarioForm
          equipos={equipos}
          usuario={{
            id: u.id,
            nombre: u.nombre,
            email: u.email,
            rol: u.rol,
            equipoIds: u.equipos.map((e) => e.equipoId),
          }}
        />
      </div>
    </div>
  );
}
