import "server-only";
import * as XLSX from "xlsx";
import { del, list, put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { PREFIJO_RESPALDOS, nombreRespaldo, respaldosAEliminar } from "@/lib/respaldo-logica";

type Fila = Record<string, unknown>;

function hoja(wb: XLSX.WorkBook, nombre: string, filas: Fila[]) {
  const limpias = filas.map((f) =>
    Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]))
  );
  const ws = XLSX.utils.json_to_sheet(limpias.length ? limpias : [{ "(vacío)": "" }]);
  XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0, 31));
}

/** Excel con todas las tablas (sin contraseñas), apto para revisar o reconstruir la base. */
export async function construirRespaldo(): Promise<Buffer> {
  const [
    voluntarios,
    equipos,
    membresias,
    usuarios,
    usuarioEquipos,
    semanas,
    respuestas,
    postulaciones,
    personas,
    areas,
    puestos,
    asignaciones,
    encargados,
    auditoria,
  ] = await Promise.all([
    prisma.voluntario.findMany({ orderBy: { nombre: "asc" } }),
    prisma.equipo.findMany({ orderBy: { nombre: "asc" } }),
    prisma.voluntarioEquipo.findMany(),
    prisma.usuario.findMany({
      orderBy: { email: "asc" },
      select: { id: true, nombre: true, email: true, rol: true, createdAt: true, expiraEn: true },
    }),
    prisma.usuarioEquipo.findMany(),
    prisma.semanaServicio.findMany({ orderBy: { fechaLunes: "desc" } }),
    prisma.respuesta.findMany({ omit: { token: true } }),
    prisma.postulacion.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.personaNueva.findMany({ orderBy: { fechaLlegada: "desc" } }),
    prisma.areaServicio.findMany({ orderBy: { orden: "asc" } }),
    prisma.puestoServicio.findMany({ orderBy: [{ areaId: "asc" }, { orden: "asc" }] }),
    prisma.asignacionPuesto.findMany(),
    prisma.encargadoArea.findMany(),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 2000 }),
  ]);

  const wb = XLSX.utils.book_new();
  const equipoNombre = new Map(equipos.map((e) => [e.id, e.nombre]));
  hoja(
    wb,
    "Voluntarios",
    voluntarios.map((v) => ({
      ...v,
      equipos: membresias
        .filter((m) => m.voluntarioId === v.id)
        .map((m) => equipoNombre.get(m.equipoId))
        .join(" | "),
    }))
  );
  hoja(wb, "Equipos", equipos);
  hoja(wb, "Membresias", membresias);
  hoja(wb, "Usuarios", usuarios);
  hoja(wb, "UsuarioEquipos", usuarioEquipos);
  hoja(wb, "Convocatorias", semanas);
  hoja(wb, "Respuestas", respuestas);
  hoja(wb, "IngresoVoluntariado", postulaciones);
  hoja(wb, "Conexion", personas);
  hoja(wb, "Areas", areas);
  hoja(wb, "Puestos", puestos);
  hoja(wb, "Asignaciones", asignaciones);
  hoja(wb, "Encargados", encargados);
  hoja(wb, "Auditoria", auditoria);

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function guardarRespaldo(origen: "automatico" | "manual") {
  const contenido = await construirRespaldo();
  const pathname = nombreRespaldo(new Date(), origen);
  const blob = await put(pathname, contenido, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const { blobs } = await list({ prefix: PREFIJO_RESPALDOS });
  const sobran = respaldosAEliminar(blobs);
  if (sobran.length) await del(sobran.map((b) => b.url));

  return { pathname: blob.pathname, bytes: contenido.length };
}

export async function listarRespaldos() {
  const { blobs } = await list({ prefix: PREFIJO_RESPALDOS });
  return blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
}
