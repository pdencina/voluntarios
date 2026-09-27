-- CreateTable
CREATE TABLE "PersonaNueva" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "campus" TEXT NOT NULL DEFAULT 'CPA',
    "fechaLlegada" TIMESTAMP(3) NOT NULL,
    "encuentro" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'NUEVA',
    "contactadaAt" TIMESTAMP(3),
    "paso1At" TIMESTAMP(3),
    "paso2At" TIMESTAMP(3),
    "atendidaPor" TEXT,
    "observaciones" TEXT,
    "creadaPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonaNueva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonaNueva_fechaLlegada_idx" ON "PersonaNueva"("fechaLlegada");

-- CreateIndex
CREATE INDEX "PersonaNueva_estado_idx" ON "PersonaNueva"("estado");

