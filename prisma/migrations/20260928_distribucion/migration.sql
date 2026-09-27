-- AlterTable
ALTER TABLE "Voluntario" ADD COLUMN     "genero" TEXT;

-- CreateTable
CREATE TABLE "AreaServicio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "encargado" TEXT,
    "equipoId" TEXT,
    "general" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AreaServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuestoServicio" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "cupos" INTEGER NOT NULL DEFAULT 1,
    "rota" BOOLEAN NOT NULL DEFAULT true,
    "genero" TEXT,
    "encuentros" TEXT NOT NULL DEFAULT 'JUEVES,DOMINGO_AM,DOMINGO_PM',
    "equipoId" TEXT,

    CONSTRAINT "PuestoServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsignacionPuesto" (
    "id" TEXT NOT NULL,
    "semanaId" TEXT NOT NULL,
    "encuentro" TEXT NOT NULL,
    "puestoId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "voluntarioId" TEXT NOT NULL,
    "fija" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsignacionPuesto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AsignacionPuesto_semanaId_encuentro_puestoId_slot_key" ON "AsignacionPuesto"("semanaId", "encuentro", "puestoId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "AsignacionPuesto_semanaId_encuentro_voluntarioId_key" ON "AsignacionPuesto"("semanaId", "encuentro", "voluntarioId");

-- AddForeignKey
ALTER TABLE "AreaServicio" ADD CONSTRAINT "AreaServicio_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuestoServicio" ADD CONSTRAINT "PuestoServicio_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AreaServicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuestoServicio" ADD CONSTRAINT "PuestoServicio_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionPuesto" ADD CONSTRAINT "AsignacionPuesto_semanaId_fkey" FOREIGN KEY ("semanaId") REFERENCES "SemanaServicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionPuesto" ADD CONSTRAINT "AsignacionPuesto_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "PuestoServicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionPuesto" ADD CONSTRAINT "AsignacionPuesto_voluntarioId_fkey" FOREIGN KEY ("voluntarioId") REFERENCES "Voluntario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

