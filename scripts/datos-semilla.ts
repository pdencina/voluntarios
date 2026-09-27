import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * Datos importados del Excel (con información personal). No se guarda en el repositorio:
 * se genera localmente con `npx tsx scripts/parse-excel.ts`.
 */
export type DatosSemilla = {
  equipos: { nombre: string; tipo: "MINISTERIO" | "ROTATIVO"; liderNombre: string | null }[];
  voluntarios: {
    nombre: string;
    nombreNormalizado: string;
    fechaNacimiento: string | null;
    fechaNacimientoRaw: string | null;
    telefono: string | null;
    correo: string | null;
    observaciones: string | null;
    equipos: string[];
  }[];
};

export function leerDatosSemilla(): DatosSemilla {
  const ruta = path.resolve(process.cwd(), "prisma/seed-data.json");
  if (!existsSync(ruta)) {
    throw new Error("Falta prisma/seed-data.json. Genéralo con: npx tsx scripts/parse-excel.ts <ruta del Excel>");
  }
  return JSON.parse(readFileSync(ruta, "utf8")) as DatosSemilla;
}
