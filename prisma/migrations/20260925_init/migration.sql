
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Equipo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "liderNombre" TEXT,
    "liderContacto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voluntario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreNormalizado" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3),
    "fechaNacimientoRaw" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voluntario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoluntarioEquipo" (
    "voluntarioId" TEXT NOT NULL,
    "equipoId" TEXT NOT NULL,

    CONSTRAINT "VoluntarioEquipo_pkey" PRIMARY KEY ("voluntarioId","equipoId")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioEquipo" (
    "usuarioId" TEXT NOT NULL,
    "equipoId" TEXT NOT NULL,

    CONSTRAINT "UsuarioEquipo_pkey" PRIMARY KEY ("usuarioId","equipoId")
);

-- CreateTable
CREATE TABLE "SemanaServicio" (
    "id" TEXT NOT NULL,
    "fechaLunes" TIMESTAMP(3) NOT NULL,
    "abierta" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadaPorId" TEXT,

    CONSTRAINT "SemanaServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Respuesta" (
    "id" TEXT NOT NULL,
    "semanaId" TEXT NOT NULL,
    "voluntarioId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "disponibleJueves" BOOLEAN,
    "disponibleDomingoAM" BOOLEAN,
    "disponibleDomingoPM" BOOLEAN,
    "respondidoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Respuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginIntento" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginIntento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Equipo_nombre_key" ON "Equipo"("nombre");

-- CreateIndex
CREATE INDEX "Voluntario_nombreNormalizado_idx" ON "Voluntario"("nombreNormalizado");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SemanaServicio_fechaLunes_key" ON "SemanaServicio"("fechaLunes");

-- CreateIndex
CREATE UNIQUE INDEX "Respuesta_token_key" ON "Respuesta"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Respuesta_semanaId_voluntarioId_key" ON "Respuesta"("semanaId", "voluntarioId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "LoginIntento_clave_createdAt_idx" ON "LoginIntento"("clave", "createdAt");

-- AddForeignKey
ALTER TABLE "VoluntarioEquipo" ADD CONSTRAINT "VoluntarioEquipo_voluntarioId_fkey" FOREIGN KEY ("voluntarioId") REFERENCES "Voluntario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoluntarioEquipo" ADD CONSTRAINT "VoluntarioEquipo_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioEquipo" ADD CONSTRAINT "UsuarioEquipo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioEquipo" ADD CONSTRAINT "UsuarioEquipo_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SemanaServicio" ADD CONSTRAINT "SemanaServicio_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Respuesta" ADD CONSTRAINT "Respuesta_semanaId_fkey" FOREIGN KEY ("semanaId") REFERENCES "SemanaServicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Respuesta" ADD CONSTRAINT "Respuesta_voluntarioId_fkey" FOREIGN KEY ("voluntarioId") REFERENCES "Voluntario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

