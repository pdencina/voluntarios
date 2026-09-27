import Link from "next/link";
import FormAccion from "@/components/FormAccion";
import BotonConfirmar from "@/components/BotonConfirmar";
import { redirect } from "next/navigation";
import { eliminarUsuarioAction } from "@/lib/gestion";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { etiquetaRol, esAdmin } from "@/lib/constants";
import NuevoUsuarioForm from "./NuevoUsuarioForm";

export default async function UsuariosPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!esAdmin(user.rol)) redirect("/");

  const [usuarios, equipos, voluntarios] = await Promise.all([
    prisma.usuario.findMany({
      orderBy: { nombre: "asc" },
      include: { equipos: { include: { equipo: { select: { nombre: true } } } } },
    }),
    prisma.equipo.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.voluntario.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      include: { equipos: { include: { equipo: { select: { nombre: true } } } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-900">Usuarios</h1>
        <p className="text-sm text-slate-500">
          Cuentas de acceso al sistema (admin y líderes de equipo).
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Crear usuario</h2>
        <NuevoUsuarioForm
          equipos={equipos}
          voluntarios={voluntarios.map((v) => ({
            id: v.id,
            nombre: v.nombre,
            correo: v.correo,
            equipoIds: v.equipos.map((e) => e.equipoId),
            equipos: v.equipos.map((e) => e.equipo.nombre).join(", "),
          }))}
          emailsConUsuario={usuarios.map((u) => u.email.toLowerCase())}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-brand-50 text-xs uppercase text-brand-700">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Correo</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2">Equipos</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 font-medium text-slate-900">{u.nombre}</td>
                <td className="px-4 py-2 text-slate-600">{u.email}</td>
                <td className="px-4 py-2 text-slate-600">{etiquetaRol(u.rol)}</td>
                <td className="px-4 py-2 text-slate-600">
                  {u.equipos.map((e) => e.equipo.nombre).join(", ") || "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right">
                  <Link
                    href={`/admin/usuarios/${u.id}`}
                    className="mr-3 text-xs font-medium text-slate-600 hover:underline"
                  >
                    Editar
                  </Link>
                  {u.id !== user.id && (
                    <FormAccion action={eliminarUsuarioAction} exito="Usuario eliminado." className="inline">
                      <input type="hidden" name="id" value={u.id} />
                      <BotonConfirmar
                        className="text-xs font-medium text-red-600 hover:underline"
                        titulo="¿Eliminar este usuario?"
                        mensaje={<>Se eliminará la cuenta de <b>{u.email}</b> y ya no podrá ingresar. Esta acción no se puede deshacer.</>}
                      >
                        Eliminar
                      </BotonConfirmar>
                    </FormAccion>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
