import * as XLSX from "xlsx";
import { getCurrentUser } from "@/lib/auth";
import { ENCUENTROS, formatoFecha, sumarDias } from "@/lib/conexion";
import { cargarPlanilla } from "@/lib/distribucion-datos";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const semanaId = new URL(request.url).searchParams.get("semana") ?? "";
  const datos = await cargarPlanilla(semanaId);
  if (!datos) return new Response("Semana no encontrada", { status: 404 });

  const volPorId = new Map(datos.vols.map((v) => [v.id, v.nombre]));
  const wb = XLSX.utils.book_new();

  for (const enc of ENCUENTROS) {
    const puestos = datos.puestosPorEncuentro(enc.value);
    const ids = new Set(puestos.map((p) => p.id));
    const asignaciones = datos.asignaciones.filter((a) => a.encuentro === enc.value);

    const filas: (string | number)[][] = [
      ["VOLUNTARIOS CAMPUS PUENTE ALTO"],
      ["Campus Puente Alto"],
      ["Fecha:", formatoFecha(sumarDias(datos.semana.fechaLunes, enc.diaOffset)), "Horario:", enc.hora],
      ["Pastores:", datos.cabecera.pastores],
      ["Administradores de Campus:", datos.cabecera.administradoresCampus],
      ["Líderes de Voluntarios:", datos.cabecera.lideresVoluntarios],
      [],
    ];
    for (const area of datos.areas) {
      const delArea = area.puestos.filter((p) => ids.has(p.id));
      if (!delArea.length) continue;
      filas.push([area.nombre]);
      filas.push(["ENCARGADO DE ÁREA:", datos.encargadoDe(area.id, enc.value) ?? ""]);
      for (const p of delArea) {
        const nombres = Array.from({ length: p.cupos }, (_, slot) => {
          const a = asignaciones.find((x) => x.puestoId === p.id && x.slot === slot);
          return a ? (volPorId.get(a.voluntarioId) ?? "") : "";
        });
        filas.push([p.nombre, ...nombres]);
      }
      filas.push([]);
    }

    const ws = XLSX.utils.aoa_to_sheet(filas);
    ws["!cols"] = [{ wch: 42 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws, enc.largo.replace(/[\\/?*[\]:]/g, "").slice(0, 31));
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const fecha = datos.semana.fechaLunes.toISOString().slice(0, 10);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="distribucion-voluntarios-${fecha}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
