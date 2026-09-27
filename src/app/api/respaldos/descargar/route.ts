import { get } from "@vercel/blob";
import { getCurrentUser } from "@/lib/auth";
import { esAdmin } from "@/lib/constants";
import { registrarAuditoria } from "@/lib/audit";
import { rutaRespaldoValida } from "@/lib/respaldo-logica";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !esAdmin(user.rol)) return new Response("No autorizado", { status: 403 });

  const pathname = new URL(request.url).searchParams.get("path");
  if (!rutaRespaldoValida(pathname)) return new Response("Ruta inválida", { status: 400 });

  const archivo = await get(pathname, { access: "private", useCache: false });
  if (!archivo) return new Response("No encontrado", { status: 404 });

  await registrarAuditoria(user, "respaldo.descargar", pathname);
  return new Response(archivo.stream, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${pathname.split("/").pop()}"`,
      "Cache-Control": "no-store",
    },
  });
}
