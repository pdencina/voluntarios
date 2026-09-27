/**
 * Carga la plantilla de áreas y puestos (tomada de "FICHA VOLUNTARIOS.xlsx") en la base de Neon.
 * No duplica: si un área ya existe por nombre, la omite.
 *   npx tsx scripts/plantilla-distribucion.ts
 */
import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);

type P = { n: string; c: number; rota?: boolean; genero?: "F" | "M"; equipo?: string; enc?: string };
type A = { nombre: string; encargado: string | null; equipo?: string; general?: boolean; puestos: P[] };

const DOMINGOS = "DOMINGO_AM,DOMINGO_PM";

const PLANTILLA: A[] = [
  {
    nombre: "AUDITORIO",
    encargado: "Nico",
    general: true,
    puestos: [
      { n: "Ingreso Hall", c: 1 },
      { n: "Puerta auditorio 1", c: 1 },
      { n: "Puerta auditorio 2 (término del encuentro)", c: 1 },
      { n: "Puerta ingreso a oficinas", c: 1 },
      { n: "Acomodadores 1", c: 3 },
      { n: "Acomodadores 2", c: 3 },
      { n: "Voluntarios Siembra (auditorio)", c: 3, equipo: "Siembra" },
    ],
  },
  {
    nombre: "PATIO PRINCIPAL",
    encargado: "Edu",
    general: true,
    puestos: [
      { n: "Letreros", c: 2 },
      { n: "Cafetería", c: 2 },
      { n: "Baños mujeres", c: 1, genero: "F" },
      { n: "Baños hombres", c: 1, genero: "M" },
    ],
  },
  { nombre: "EQUIPO CONEXIÓN", encargado: "Jonathan y Flavia", equipo: "Conexión", puestos: [{ n: "Conexión", c: 4 }] },
  { nombre: "SALA DE BEBÉS", encargado: "Yiset & Omar", equipo: "Sala Bebés", puestos: [{ n: "Sala de bebés", c: 2 }] },
  {
    nombre: "SEGURIDAD",
    encargado: null,
    equipo: "Seguridad",
    puestos: [
      { n: "Encargado de seguridad de la semana", c: 1, rota: false },
      { n: "1° voluntario seguridad", c: 1 },
      { n: "2° voluntario seguridad", c: 1 },
      { n: "3° voluntario seguridad", c: 1 },
      { n: "4° voluntario seguridad", c: 1 },
    ],
  },
  { nombre: "AR KIDS", encargado: "Cecilia / Daniella", equipo: "Kids", puestos: [{ n: "Voluntarios Kids", c: 5 }] },
  { nombre: "AR TWEENS", encargado: "Joseph B.", equipo: "Tweens", puestos: [{ n: "Voluntarios Tweens", c: 4 }] },
  { nombre: "SALA SENSORIAL", encargado: "Pres. Pablo & Naty", equipo: "Salita Sensorial", puestos: [{ n: "Sala sensorial", c: 2 }] },
  { nombre: "CAMBIOS", encargado: "David & Diandra", general: true, puestos: [{ n: "Cambios", c: 3, enc: DOMINGOS }] },
  {
    nombre: "STANDS Y SIEMBRA",
    encargado: null,
    puestos: [
      { n: "Stand oración", c: 2, equipo: "Oración" },
      { n: "Stand AR Merch", c: 2, equipo: "Merch" },
      { n: "Case de siembra", c: 2, equipo: "Siembra" },
      { n: "Punto de siembra", c: 2, equipo: "Siembra" },
    ],
  },
  { nombre: "STAND APLC", encargado: null, general: true, puestos: [{ n: "Stand APLC", c: 2 }] },
];

async function idEquipo(nombre?: string) {
  if (!nombre) return null;
  const [e] = await sql`SELECT id FROM "Equipo" WHERE nombre = ${nombre}`;
  if (!e) console.warn(`  ⚠ Equipo "${nombre}" no existe; el puesto quedará sin equipo asignado.`);
  return (e?.id as string) ?? null;
}

async function main() {
  let orden = 0;
  for (const a of PLANTILLA) {
    orden++;
    const [existe] = await sql`SELECT id FROM "AreaServicio" WHERE nombre = ${a.nombre}`;
    if (existe) {
      console.log(`= ${a.nombre} ya existe, se omite`);
      continue;
    }
    const areaId = randomUUID();
    await sql`
      INSERT INTO "AreaServicio" (id, nombre, orden, encargado, "equipoId", general)
      VALUES (${areaId}, ${a.nombre}, ${orden}, ${a.encargado}, ${await idEquipo(a.equipo)}, ${!!a.general})`;
    let o = 0;
    for (const p of a.puestos) {
      o++;
      await sql`
        INSERT INTO "PuestoServicio" (id, "areaId", nombre, orden, cupos, rota, genero, encuentros, "equipoId")
        VALUES (${randomUUID()}, ${areaId}, ${p.n}, ${o}, ${p.c}, ${p.rota ?? true}, ${p.genero ?? null},
                ${p.enc ?? "JUEVES,DOMINGO_AM,DOMINGO_PM"}, ${await idEquipo(p.equipo)})`;
    }
    console.log(`+ ${a.nombre} (${a.puestos.length} puestos)`);
  }
  const [c] = await sql`SELECT (SELECT count(*)::int FROM "AreaServicio") areas, (SELECT count(*)::int FROM "PuestoServicio") puestos`;
  console.log(c);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
