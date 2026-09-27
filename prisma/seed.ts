import { randomBytes } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { leerDatosSemilla } from "../scripts/datos-semilla";

const seedData = leerDatosSemilla();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function generarPassword() {
  return randomBytes(9).toString("base64url");
}

async function main() {
  console.log(`Equipos a crear: ${seedData.equipos.length}`);
  console.log(`Voluntarios a crear: ${seedData.voluntarios.length}`);

  const equipoIdPorNombre = new Map<string, string>();
  for (const eq of seedData.equipos) {
    const creado = await prisma.equipo.upsert({
      where: { nombre: eq.nombre },
      update: {
        tipo: eq.tipo,
        liderNombre: eq.liderNombre,
      },
      create: {
        nombre: eq.nombre,
        tipo: eq.tipo,
        liderNombre: eq.liderNombre,
      },
    });
    equipoIdPorNombre.set(eq.nombre, creado.id);
  }

  for (const v of seedData.voluntarios) {
    const voluntario = await prisma.voluntario.upsert({
      where: { id: `seed-${v.nombreNormalizado}` },
      update: {
        nombre: v.nombre,
        nombreNormalizado: v.nombreNormalizado,
        fechaNacimiento: v.fechaNacimiento ? new Date(v.fechaNacimiento) : null,
        fechaNacimientoRaw: v.fechaNacimientoRaw,
        telefono: v.telefono,
        correo: v.correo,
        observaciones: v.observaciones,
      },
      create: {
        id: `seed-${v.nombreNormalizado}`,
        nombre: v.nombre,
        nombreNormalizado: v.nombreNormalizado,
        fechaNacimiento: v.fechaNacimiento ? new Date(v.fechaNacimiento) : null,
        fechaNacimientoRaw: v.fechaNacimientoRaw,
        telefono: v.telefono,
        correo: v.correo,
        observaciones: v.observaciones,
      },
    });

    for (const nombreEquipo of v.equipos) {
      const equipoId = equipoIdPorNombre.get(nombreEquipo);
      if (!equipoId) continue;
      await prisma.voluntarioEquipo.upsert({
        where: {
          voluntarioId_equipoId: {
            voluntarioId: voluntario.id,
            equipoId,
          },
        },
        update: {},
        create: { voluntarioId: voluntario.id, equipoId },
      });
    }
  }

  const adminEmail = "admin@cpa.local";
  const existente = await prisma.usuario.findUnique({
    where: { email: adminEmail },
  });

  if (!existente) {
    const password = process.env.ADMIN_INITIAL_PASSWORD || generarPassword();
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.usuario.create({
      data: {
        nombre: "Administrador",
        email: adminEmail,
        passwordHash,
        rol: "ADMIN",
      },
    });
    console.log("");
    console.log("========================================");
    console.log("Usuario admin creado:");
    console.log(`  Email:    ${adminEmail}`);
    console.log(`  Password: ${password}`);
    console.log("  (guarda esta contraseña, no se volverá a mostrar)");
    console.log("========================================");
  } else {
    console.log("");
    console.log(`Usuario admin ya existía (${adminEmail}), no se modifica la contraseña.`);
  }

  console.log("");
  console.log("Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
