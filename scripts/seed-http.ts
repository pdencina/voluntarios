/**
 * Siembra la base de Neon usando el driver HTTPS (puerto 443), para redes que
 * bloquean el protocolo Postgres. Idempotente: no pisa datos ya existentes.
 * Uso: npx tsx scripts/seed-http.ts
 */
import { config } from "dotenv";
import { randomBytes, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { leerDatosSemilla } from "./datos-semilla";

config({ path: ".env.local", quiet: true });
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL");
const sql = neon(url);
const seedData = leerDatosSemilla();

async function main() {
  const idPorEquipo = new Map<string, string>();
  for (const eq of seedData.equipos) {
    const [row] = await sql`
      INSERT INTO "Equipo" (id, nombre, tipo, "liderNombre")
      VALUES (${randomUUID()}, ${eq.nombre}, ${eq.tipo}, ${eq.liderNombre})
      ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
      RETURNING id`;
    idPorEquipo.set(eq.nombre, row.id as string);
  }

  const consultas = [];
  for (const v of seedData.voluntarios) {
    const id = `seed-${v.nombreNormalizado}`;
    consultas.push(sql`
      INSERT INTO "Voluntario"
        (id, nombre, "nombreNormalizado", "fechaNacimiento", "fechaNacimientoRaw", telefono, correo, observaciones)
      VALUES (${id}, ${v.nombre}, ${v.nombreNormalizado}, ${v.fechaNacimiento}, ${v.fechaNacimientoRaw},
              ${v.telefono}, ${v.correo}, ${v.observaciones})
      ON CONFLICT (id) DO NOTHING`);
    for (const nombreEquipo of v.equipos) {
      const equipoId = idPorEquipo.get(nombreEquipo);
      if (!equipoId) continue;
      consultas.push(sql`
        INSERT INTO "VoluntarioEquipo" ("voluntarioId", "equipoId")
        VALUES (${id}, ${equipoId}) ON CONFLICT DO NOTHING`);
    }
  }
  await sql.transaction(consultas);

  const email = "admin@cpa.local";
  const [existe] = await sql`SELECT id FROM "Usuario" WHERE email = ${email}`;
  if (!existe) {
    const password = process.env.ADMIN_INITIAL_PASSWORD || randomBytes(9).toString("base64url");
    await sql`
      INSERT INTO "Usuario" (id, nombre, email, "passwordHash", rol)
      VALUES (${randomUUID()}, 'Administrador', ${email}, ${await bcrypt.hash(password, 10)}, 'ADMIN')`;
    console.log(`ADMIN_EMAIL=${email}\nADMIN_PASSWORD=${password}`);
  } else {
    console.log("El admin ya existía; contraseña sin cambios.");
  }

  const [c] = await sql`SELECT
    (SELECT count(*)::int FROM "Equipo") equipos,
    (SELECT count(*)::int FROM "Voluntario") voluntarios,
    (SELECT count(*)::int FROM "VoluntarioEquipo") membresias`;
  console.log(c);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
