-- CreateTable
CREATE TABLE "Postulacion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "correo" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "tiempoIglesia" TEXT NOT NULL,
    "equipoInteresId" TEXT,
    "recomendadoPor" TEXT,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "decisionObs" TEXT,
    "decididaPorId" TEXT,
    "decididaAt" TIMESTAMP(3),
    "creadaPorId" TEXT,
    "voluntarioId" TEXT,
    "equipoAsignadoId" TEXT,
    "integradaAt" TIMESTAMP(3),
    "liderAvisadoAt" TIMESTAMP(3),
    "bienvenidaAt" TIMESTAMP(3),
    "bienvenidaPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Postulacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Postulacion_estado_idx" ON "Postulacion"("estado");

-- AddForeignKey
ALTER TABLE "Postulacion" ADD CONSTRAINT "Postulacion_equipoInteresId_fkey" FOREIGN KEY ("equipoInteresId") REFERENCES "Equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postulacion" ADD CONSTRAINT "Postulacion_equipoAsignadoId_fkey" FOREIGN KEY ("equipoAsignadoId") REFERENCES "Equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postulacion" ADD CONSTRAINT "Postulacion_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postulacion" ADD CONSTRAINT "Postulacion_voluntarioId_fkey" FOREIGN KEY ("voluntarioId") REFERENCES "Voluntario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

