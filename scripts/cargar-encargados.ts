/**
 * Carga la cabecera de la planilla y los encargados por encuentro que difieren de los valores por
 * defecto, según "FICHA VOLUNTARIOS.xlsx". Idempotente. Uso: npx tsx scripts/cargar-encargados.ts
 */
import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);

const DEFECTO_AREA: Record<string, string> = {
  "AR KIDS": "Daniella & Cecilia",
  CAMBIOS: "David & Diandra",
};

// [área, encuentro, encargado]
const POR_ENCUENTRO: [string, string, string][] = [
  ["AR KIDS", "JUEVES", "Cecilia"],
  ["CAMBIOS", "DOMINGO_PM", "Bernabe"],
];

async function main() {
  for (const [area, texto] of Object.entries(DEFECTO_AREA)) {
    await sql`UPDATE "AreaServicio" SET encargado = ${texto} WHERE nombre = ${area}`;
  }

  await sql`UPDATE "SemanaServicio" SET
      pastores = COALESCE(pastores, 'Pablo & Naty'),
      "administradoresCampus" = COALESCE("administradoresCampus", 'Min. Rodrigo & Kathy'),
      "lideresVoluntarios" = COALESCE("lideresVoluntarios", 'Eduardo & Nicole')`;

  const semanas = await sql`SELECT id FROM "SemanaServicio"`;
  let n = 0;
  for (const s of semanas) {
    for (const [area, encuentro, texto] of POR_ENCUENTRO) {
      const [a] = await sql`SELECT id FROM "AreaServicio" WHERE nombre = ${area}`;
      if (!a) continue;
      await sql`
        INSERT INTO "EncargadoArea" (id, "semanaId", encuentro, "areaId", texto)
        VALUES (${randomUUID()}, ${s.id}, ${encuentro}, ${a.id}, ${texto})
        ON CONFLICT ("semanaId", encuentro, "areaId") DO NOTHING`;
      n++;
    }
  }
  console.log(`Cabecera cargada en ${semanas.length} semana(s); ${n} encargados por encuentro.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
