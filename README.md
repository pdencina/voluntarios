# Voluntarios CPA

Sistema de administración del voluntariado del Campus Puente Alto: equipos, voluntarios,
convocatoria semanal (Jueves 8 PM, Domingo 11 AM y 6 PM), distribución de puestos,
ingreso de nuevos voluntarios y registro de personas nuevas del equipo de Conexión.

Producción: https://sistema-voluntario.vercel.app

## Tecnología

- Next.js 16 (App Router, Server Actions) + TypeScript + Tailwind CSS 4
- Prisma 7 con PostgreSQL en Neon (adaptador `@prisma/adapter-pg`)
- Vercel (hosting, Cron semanal de respaldo, Blob privado para respaldos)
- Vitest para la lógica (reglas de permisos, distribución, reportes, límites de acceso)

## Variables de entorno

Se descargan con `npx vercel env pull .env.local`.

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión a Postgres (con pooler) usada por la app |
| `DATABASE_URL_UNPOOLED` | Conexión directa usada por las migraciones |
| `SESSION_SECRET` | Firma de las sesiones y de los links de reunión |
| `BLOB_READ_WRITE_TOKEN` | Almacén privado de respaldos |
| `CRON_SECRET` | Protege el respaldo automático semanal |

## Desarrollo

```bash
npm install
npx vercel env pull .env.local
npm run dev
```

Comandos útiles:

```bash
npm test                     # pruebas
npx tsc --noEmit             # tipos
npx eslint .                 # estilo
npx prisma migrate dev       # nueva migración (requiere conexión directa a Postgres)
```

Las migraciones se aplican solas al desplegar (`npm run build` ejecuta `prisma migrate deploy`).

## Datos

Los datos personales **no** se guardan en este repositorio. Para una base nueva:

```bash
npx tsx scripts/parse-excel.ts "ruta/al/Organigrama.xlsx"   # genera prisma/seed-data.json (ignorado por git)
npx tsx scripts/seed-http.ts                                 # carga equipos, voluntarios y el admin
npx tsx scripts/plantilla-distribucion.ts                    # áreas y puestos de la planilla
```

Datos de demostración: `npx tsx scripts/demo.ts crear` y `npx tsx scripts/demo.ts limpiar`.
Las cuentas demo vencen solas (campo `expiraEn`).

## Roles

| Rol | Alcance |
|---|---|
| Administrador / Pastor de campus | Todo, incluido usuarios, respaldos y auditoría |
| Administrador de campus | Sus equipos, convocatorias, distribución e ingreso de voluntarios |
| Líder de equipo | Sus equipos; los líderes de equipos rotativos arman la distribución completa |
