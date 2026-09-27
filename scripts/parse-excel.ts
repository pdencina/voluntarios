/**
 * Script de una sola vez: lee el Excel "Organigrama CPA" y genera
 * prisma/seed-data.json con equipos, voluntarios y sus membresías ya
 * resueltas (incluyendo deduplicación de un mismo voluntario que aparece
 * en varias hojas, por nombre normalizado).
 *
 * Uso: npx tsx scripts/parse-excel.ts ["ruta/al/archivo.xlsx"]
 */
import * as XLSX from "xlsx";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { normalizarNombre } from "../src/lib/normalize";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Uso: npx tsx scripts/parse-excel.ts "ruta/al/Organigrama.xlsx"');
  process.exit(1);
}

const MINISTERIOS = [
  "Seguridad",
  "Equipo Técnico CPA",
  "Mantención",
  "Conexión",
  "Sala Bebés",
  "Kids",
  "Tweens",
  "Merch",
  "Salita Sensorial",
  "Oración",
  "Cocina",
  "Social",
  "Siembra",
];

type RawRow = (string | number)[];

type VoluntarioBruto = {
  nombre: string;
  fechaNacimientoRaw: string | number | null;
  telefono: string | null;
  correo: string | null;
  observaciones: string | null;
  equipoNombre: string;
};

type EquipoBruto = {
  nombre: string;
  tipo: "MINISTERIO" | "ROTATIVO";
  liderNombre: string | null;
};

const equipos: EquipoBruto[] = [];
const voluntariosBrutos: VoluntarioBruto[] = [];

function cell(row: RawRow | undefined, col: number): string {
  if (!row) return "";
  const v = row[col];
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function isEmptyRow(row: RawRow | undefined): boolean {
  if (!row) return true;
  return row.every((c) => String(c ?? "").trim() === "");
}

function esNombreValido(nombre: string): boolean {
  if (!nombre) return false;
  if (/^info\b/i.test(nombre)) return false;
  return true;
}

function parseMinisterio(sheetName: string, data: RawRow[]) {
  // Header: fila que contiene "Nombre voluntario"
  let headerRowIdx = -1;
  let colNombre = -1;
  let colFecha = -1;
  let colContacto = -1;
  let colCorreo = -1;
  let colObs = -1;
  let colArea = -1;

  for (let r = 0; r < Math.min(data.length, 15); r++) {
    const row = data[r];
    if (!row) continue;
    const idx = row.findIndex((c) => /nombre voluntario/i.test(String(c)));
    if (idx !== -1) {
      headerRowIdx = r;
      colNombre = idx;
      row.forEach((c, i) => {
        const text = String(c);
        if (/fecha nacimiento/i.test(text)) colFecha = i;
        else if (/^contacto$/i.test(text)) colContacto = i;
        else if (/^correo$/i.test(text)) colCorreo = i;
        else if (/observaciones/i.test(text)) colObs = i;
        else if (/^[aá]rea$/i.test(text)) colArea = i;
      });
      break;
    }
  }

  if (headerRowIdx === -1) {
    console.warn(`  ⚠ No se encontró encabezado en "${sheetName}", se omite.`);
    return;
  }

  // Líder: primera fila no vacía escaneando hacia arriba desde el header.
  let liderNombre: string | null = null;
  for (let r = headerRowIdx - 1; r >= 0; r--) {
    const row = data[r];
    if (!isEmptyRow(row)) {
      liderNombre = row
        .map((c) => String(c ?? "").trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      break;
    }
  }

  equipos.push({ nombre: sheetName, tipo: "MINISTERIO", liderNombre });

  for (let r = headerRowIdx + 1; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;
    const nombre = cell(row, colNombre);
    if (!esNombreValido(nombre)) continue;

    const partesObs: string[] = [];
    if (colArea !== -1) {
      const area = cell(row, colArea);
      if (area) partesObs.push(`Área: ${area}`);
    }
    if (colObs !== -1) {
      const obs = cell(row, colObs);
      if (obs) partesObs.push(obs);
    }

    voluntariosBrutos.push({
      nombre,
      fechaNacimientoRaw: colFecha !== -1 ? row[colFecha] ?? null : null,
      telefono: colContacto !== -1 ? cell(row, colContacto) || null : null,
      correo: colCorreo !== -1 ? cell(row, colCorreo) || null : null,
      observaciones: partesObs.length ? partesObs.join(" — ") : null,
      equipoNombre: sheetName,
    });
  }
}

function parseRotativos(data: RawRow[]) {
  // Fila de encabezados con las 4 repeticiones de "Nombre voluntario"
  let headerRowIdx = -1;
  const bloques: { nombreCol: number }[] = [];
  for (let r = 0; r < Math.min(data.length, 20); r++) {
    const row = data[r];
    if (!row) continue;
    const idxs: number[] = [];
    row.forEach((c, i) => {
      if (/nombre voluntario/i.test(String(c))) idxs.push(i);
    });
    if (idxs.length >= 2) {
      headerRowIdx = r;
      idxs.forEach((i) => bloques.push({ nombreCol: i }));
      break;
    }
  }

  if (headerRowIdx === -1 || bloques.length === 0) {
    console.warn('  ⚠ No se encontraron los bloques de equipos rotativos.');
    return;
  }

  bloques.forEach((b, i) => {
    const nCol = b.nombreCol;
    const blockStart = nCol - 1; // columna "Nº"
    // Líder: buscar hacia arriba desde el header, en la columna de inicio del bloque.
    let liderNombre: string | null = null;
    for (let r = headerRowIdx - 1; r >= 0; r--) {
      const val = cell(data[r], blockStart);
      if (val && !/^equipo\s*\d+/i.test(val)) {
        liderNombre = val;
        break;
      }
    }

    const nombreEquipo = `Equipo Rotativo ${i + 1}`;
    equipos.push({ nombre: nombreEquipo, tipo: "ROTATIVO", liderNombre });

    for (let r = headerRowIdx + 1; r < data.length; r++) {
      const row = data[r];
      if (!row) continue;
      const nombre = cell(row, nCol);
      if (!esNombreValido(nombre)) continue;

      voluntariosBrutos.push({
        nombre,
        fechaNacimientoRaw: row[nCol + 1] ?? null,
        telefono: cell(row, nCol + 2) || null,
        correo: cell(row, nCol + 3) || null,
        observaciones: cell(row, nCol + 4) || null,
        equipoNombre: nombreEquipo,
      });
    }
  });
}

function excelSerialToISO(serial: number): string | null {
  // Excel (sistema 1900) cuenta desde 1899-12-30.
  const ms = (serial - 25569) * 86400 * 1000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() < 1900 || date.getFullYear() > 2100) return null;
  return date.toISOString();
}

function parseFechaTexto(raw: string): string | null {
  const limpio = raw.replace(/\s+/g, "");
  // dd/mm/yyyy o dd-mm-yyyy
  const m = limpio.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return null;
}

function resolverFecha(raw: string | number | null): {
  iso: string | null;
  crudo: string | null;
} {
  if (raw === null || raw === undefined || raw === "") {
    return { iso: null, crudo: null };
  }
  if (typeof raw === "number") {
    const iso = excelSerialToISO(raw);
    return { iso, crudo: iso ? null : String(raw) };
  }
  const texto = String(raw).trim();
  if (!texto) return { iso: null, crudo: null };
  const iso = parseFechaTexto(texto);
  return { iso, crudo: iso ? null : texto };
}

function main() {
  console.log(`Leyendo: ${inputPath}`);
  const wb = XLSX.readFile(inputPath);

  for (const nombreHoja of MINISTERIOS) {
    const ws = wb.Sheets[nombreHoja];
    if (!ws) {
      console.warn(`  ⚠ Hoja "${nombreHoja}" no encontrada, se omite.`);
      continue;
    }
    console.log(`Procesando ministerio: ${nombreHoja}`);
    const data = XLSX.utils.sheet_to_json<RawRow>(ws, {
      header: 1,
      defval: "",
    });
    parseMinisterio(nombreHoja, data);
  }

  const wsRot = wb.Sheets["Voluntarios Servicio"];
  if (wsRot) {
    console.log("Procesando equipos rotativos: Voluntarios Servicio");
    const data = XLSX.utils.sheet_to_json<RawRow>(wsRot, {
      header: 1,
      defval: "",
    });
    parseRotativos(data);
  }

  // Deduplicar voluntarios por nombre normalizado, uniendo sus equipos.
  type VoluntarioFinal = {
    nombre: string;
    nombreNormalizado: string;
    fechaNacimiento: string | null;
    fechaNacimientoRaw: string | null;
    telefono: string | null;
    correo: string | null;
    observaciones: string | null;
    equipos: string[];
  };

  const porNombre = new Map<string, VoluntarioFinal>();

  for (const vb of voluntariosBrutos) {
    const key = normalizarNombre(vb.nombre);
    const { iso, crudo } = resolverFecha(vb.fechaNacimientoRaw);
    const existente = porNombre.get(key);
    if (!existente) {
      porNombre.set(key, {
        nombre: vb.nombre,
        nombreNormalizado: key,
        fechaNacimiento: iso,
        fechaNacimientoRaw: crudo,
        telefono: vb.telefono,
        correo: vb.correo,
        observaciones: vb.observaciones,
        equipos: [vb.equipoNombre],
      });
    } else {
      if (!existente.equipos.includes(vb.equipoNombre)) {
        existente.equipos.push(vb.equipoNombre);
      }
      existente.fechaNacimiento ??= iso;
      existente.fechaNacimientoRaw ??= crudo;
      existente.telefono ??= vb.telefono;
      existente.correo ??= vb.correo;
      if (vb.observaciones && vb.observaciones !== existente.observaciones) {
        existente.observaciones = [existente.observaciones, vb.observaciones]
          .filter(Boolean)
          .join(" — ");
      }
    }
  }

  const voluntarios = Array.from(porNombre.values());
  const multiEquipo = voluntarios.filter((v) => v.equipos.length > 1);

  const outPath = path.resolve(__dirname, "../prisma/seed-data.json");
  writeFileSync(
    outPath,
    JSON.stringify({ equipos, voluntarios }, null, 2),
    "utf-8"
  );

  console.log("");
  console.log(`Equipos: ${equipos.length}`);
  console.log(`Voluntarios únicos: ${voluntarios.length}`);
  console.log(`Voluntarios en 2+ equipos: ${multiEquipo.length}`);
  console.log(`Escrito en: ${outPath}`);
}

main();
