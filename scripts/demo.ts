/**
 * Datos de demostración (usuarios por rol, un equipo ficticio con voluntarios de prueba
 * y algunas personas nuevas de Conexión). Usa Neon por HTTPS.
 *
 *   npx tsx scripts/demo.ts crear     -> crea/actualiza (imprime las contraseñas nuevas)
 *   npx tsx scripts/demo.ts limpiar   -> elimina todo lo marcado como demo
 */
import { config } from "dotenv";
import { randomBytes, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

config({ path: ".env.local", quiet: true });
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL");
const sql = neon(url);

const NOMBRES = ["Ana", "Bruno", "Camila", "Diego", "Elena", "Felipe", "Gaby", "Héctor", "Isabel", "Javier"];

function normalizar(n: string) {
  return n.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}
function clave() {
  const abc = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(12), (b) => abc[b % abc.length]).join("");
}

async function idEquipo(nombre: string) {
  const [e] = await sql`SELECT id FROM "Equipo" WHERE nombre = ${nombre}`;
  return e?.id as string | undefined;
}

async function limpiar() {
  await sql`DELETE FROM "PersonaNueva" WHERE nombre LIKE 'Demo %'`;
  await sql`DELETE FROM "Usuario" WHERE email LIKE 'demo.%@cpa.local'`;
  await sql`DELETE FROM "Voluntario" WHERE id LIKE 'demo-%'`;
  await sql`DELETE FROM "Equipo" WHERE nombre = 'Equipo Demo'`;
  console.log("Datos de demostración eliminados.");
}

async function crear() {
  // Equipo y voluntarios ficticios
  let demoId = await idEquipo("Equipo Demo");
  if (!demoId) {
    demoId = randomUUID();
    await sql`INSERT INTO "Equipo" (id, nombre, tipo, "liderNombre") VALUES (${demoId}, 'Equipo Demo', 'ROTATIVO', 'Líder Demo')`;
  }
  const consultas = [];
  for (let i = 0; i < NOMBRES.length; i++) {
    const n = NOMBRES[i];
    const nombre = `${n} Demo`;
    const id = `demo-${i + 1}`;
    consultas.push(sql`
      INSERT INTO "Voluntario" (id, nombre, "nombreNormalizado", telefono, correo, observaciones)
      VALUES (${id}, ${nombre}, ${normalizar(nombre)}, ${"9 0000 00" + String(i).padStart(2, "0")}, ${`demo${i + 1}@example.com`}, 'Voluntario de demostración')
      ON CONFLICT (id) DO NOTHING`);
    consultas.push(sql`
      INSERT INTO "VoluntarioEquipo" ("voluntarioId", "equipoId") VALUES (${id}, ${demoId}) ON CONFLICT DO NOTHING`);
  }
  await sql.transaction(consultas);

  // Responder convocatorias abiertas: agrega a los voluntarios demo
  const abiertas = await sql`SELECT id FROM "SemanaServicio" WHERE abierta = true`;
  for (const s of abiertas) {
    const cons = NOMBRES.map((_, i) =>
      sql`INSERT INTO "Respuesta" (id, "semanaId", "voluntarioId", token)
          VALUES (${randomUUID()}, ${s.id}, ${`demo-${i + 1}`}, ${randomBytes(24).toString("hex")})
          ON CONFLICT ("semanaId", "voluntarioId") DO NOTHING`
    );
    await sql.transaction(cons);
  }

  // Usuarios por rol
  const kids = await idEquipo("Kids");
  const tweens = await idEquipo("Tweens");
  const conexion = await idEquipo("Conexión");
  const usuarios: { nombre: string; email: string; rol: string; equipos: (string | undefined)[]; etiqueta: string }[] = [
    { nombre: "Demo Administrador", email: "demo.admin@cpa.local", rol: "ADMIN", equipos: [], etiqueta: "Administrador" },
    { nombre: "Demo Pastor de Campus", email: "demo.pastor@cpa.local", rol: "PASTOR_CAMPUS", equipos: [], etiqueta: "Pastor de campus" },
    { nombre: "Demo Adm. de Campus", email: "demo.admincampus@cpa.local", rol: "ADMIN_CAMPUS", equipos: [demoId, kids, tweens], etiqueta: "Administrador de campus" },
    { nombre: "Demo Líder de Equipo", email: "demo.lider@cpa.local", rol: "LIDER", equipos: [demoId], etiqueta: "Líder (Equipo Demo)" },
    { nombre: "Demo Líder de Conexión", email: "demo.conexion@cpa.local", rol: "LIDER", equipos: [conexion], etiqueta: "Líder (equipo Conexión)" },
  ];

  // Las cuentas demo ven datos reales: vencen solas a los 3 días.
  const expira = new Date(Date.now() + 3 * 86400000).toISOString();
  const salida: string[] = [];
  for (const u of usuarios) {
    const password = clave();
    const hash = await bcrypt.hash(password, 10);
    const [existe] = await sql`SELECT id FROM "Usuario" WHERE email = ${u.email}`;
    const uid = (existe?.id as string) ?? randomUUID();
    if (existe) {
      await sql`UPDATE "Usuario" SET nombre = ${u.nombre}, rol = ${u.rol}, "passwordHash" = ${hash}, "expiraEn" = ${expira}, "sesionVersion" = "sesionVersion" + 1 WHERE id = ${uid}`;
    } else {
      await sql`INSERT INTO "Usuario" (id, nombre, email, "passwordHash", rol, "expiraEn") VALUES (${uid}, ${u.nombre}, ${u.email}, ${hash}, ${u.rol}, ${expira})`;
    }
    await sql`DELETE FROM "UsuarioEquipo" WHERE "usuarioId" = ${uid}`;
    for (const e of u.equipos.filter(Boolean)) {
      await sql`INSERT INTO "UsuarioEquipo" ("usuarioId", "equipoId") VALUES (${uid}, ${e}) ON CONFLICT DO NOTHING`;
    }
    salida.push(`${u.etiqueta.padEnd(28)} ${u.email.padEnd(30)} ${password}`);
  }

  // Personas nuevas de ejemplo para Conexión (semana actual)
  await sql`DELETE FROM "PersonaNueva" WHERE nombre LIKE 'Demo %'`;
  const hoy = new Date();
  const d0 = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
  const lunes = new Date(d0);
  lunes.setUTCDate(lunes.getUTCDate() - ((lunes.getUTCDay() + 6) % 7));
  const dia = (n: number) => new Date(lunes.getTime() + n * 86400000).toISOString();
  const ejemplos = [
    ["Demo Visita 1", "JUEVES", "MUJER", "RRSS", 3, "PASO_1"],
    ["Demo Visita 2", "JUEVES", "HOMBRE", "AMIGOS_FAMILIA", 3, "CONTACTADA"],
    ["Demo Visita 3", "DOMINGO_AM", "MUJER", "AMIGOS_FAMILIA", 6, "NUEVA"],
    ["Demo Visita 4", "DOMINGO_AM", "JOVEN", "RRSS", 6, "NUEVA"],
    ["Demo Visita 5", "DOMINGO_PM", "NINO", "AMIGOS_FAMILIA", 6, "NUEVA"],
    ["Demo Visita 6", "DOMINGO_PM", "MUJER", "RRSS", 6, "PASO_1"],
  ] as const;
  for (const [nombre, enc, cat, ori, off, estado] of ejemplos) {
    const paso1 = estado === "PASO_1" ? dia(off) : null;
    const contactada = estado !== "NUEVA" ? dia(off) : null;
    await sql`
      INSERT INTO "PersonaNueva" (id, nombre, telefono, campus, "fechaLlegada", encuentro, categoria, origen, estado, "contactadaAt", "paso1At", "atendidaPor")
      VALUES (${randomUUID()}, ${nombre}, '9 1111 1111', 'CPA', ${dia(off)}, ${enc}, ${cat}, ${ori}, ${estado}, ${contactada}, ${paso1}, 'Demo Líder de Conexión')`;
  }

  console.log("\nUSUARIOS DE DEMOSTRACIÓN\n");
  console.log(salida.join("\n"));
  const [c] = await sql`SELECT count(*)::int AS n FROM "Respuesta" WHERE "voluntarioId" LIKE 'demo-%'`;
  console.log(`\nEquipo Demo con ${NOMBRES.length} voluntarios ficticios (${c.n} respuestas creadas en convocatorias abiertas).`);
}

const modo = process.argv[2];
(modo === "limpiar" ? limpiar() : modo === "crear" ? crear() : Promise.reject(new Error("Uso: crear | limpiar")))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
