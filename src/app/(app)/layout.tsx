import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeConexion } from "@/lib/conexion-acceso";
import { esAdmin, etiquetaRol, puedePostular } from "@/lib/constants";
import AppSidebar, { type GrupoMenu } from "./AppSidebar";
import CambioObligatorio from "./CambioObligatorio";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.debeCambiarPassword) {
    return <CambioObligatorio nombre={user.nombre} />;
  }

  const grupos: GrupoMenu[] = [
    {
      titulo: "General",
      items: [{ href: "/", label: "Panel", icono: "panel" }],
    },
    {
      titulo: "Voluntariado",
      items: [
        { href: "/equipos", label: "Equipos", icono: "equipos" },
        { href: "/voluntarios", label: "Voluntarios", icono: "voluntarios" },
        { href: "/convocatorias", label: "Convocatorias", icono: "convocatorias" },
        { href: "/convocatorias/en-vivo", label: "Convocatoria en vivo", icono: "envivo" },
        { href: "/distribucion", label: "Distribución", icono: "distribucion" },
        ...(puedePostular(user.rol)
          ? [{ href: "/ingreso-voluntariado", label: "Ingreso Voluntariado", icono: "ingreso" as const }]
          : []),
        { href: "/bienvenidas", label: "Bienvenida voluntarios", icono: "bienvenida" },
      ],
    },
  ];
  if (await puedeConexion(user)) {
    grupos.push({
      titulo: "Conexión",
      items: [{ href: "/conexion", label: "Personas nuevas", icono: "conexion" }],
    });
  }
  if (esAdmin(user.rol)) {
    grupos.push({
      titulo: "Administración",
      items: [
        { href: "/admin/usuarios", label: "Usuarios", icono: "usuarios" },
        { href: "/admin/duplicados", label: "Duplicados", icono: "duplicados" },
        { href: "/admin/auditoria", label: "Auditoría", icono: "auditoria" },
        { href: "/admin/respaldos", label: "Respaldos", icono: "respaldos" },
      ],
    });
  }

  const bienvenidasPendientes = await prisma.postulacion.count({
    where: {
      estado: "INTEGRADA",
      bienvenidaAt: null,
      ...(esAdmin(user.rol) ? {} : { equipoAsignadoId: { in: user.equipoIds } }),
    },
  });

  return (
    <div className="min-h-full lg:flex">
      <AppSidebar
        grupos={grupos}
        nombre={user.nombre}
        rol={etiquetaRol(user.rol)}
        pendientes={{ "/bienvenidas": bienvenidasPendientes }}
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
