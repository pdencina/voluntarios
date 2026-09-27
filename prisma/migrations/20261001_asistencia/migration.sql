-- CreateTable
CREATE TABLE "Asistencia" (
    "id" TEXT NOT NULL,
    "semanaId" TEXT NOT NULL,
    "encuentro" TEXT NOT NULL,
    "voluntarioId" TEXT NOT NULL,
    "llegadaAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registradaPorId" TEXT,

    CONSTRAINT "Asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Asistencia_voluntarioId_idx" ON "Asistencia"("voluntarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Asistencia_semanaId_encuentro_voluntarioId_key" ON "Asistencia"("semanaId", "encuentro", "voluntarioId");

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_semanaId_fkey" FOREIGN KEY ("semanaId") REFERENCES "SemanaServicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_voluntarioId_fkey" FOREIGN KEY ("voluntarioId") REFERENCES "Voluntario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

