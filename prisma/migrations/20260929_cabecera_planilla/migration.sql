-- AlterTable
ALTER TABLE "SemanaServicio" ADD COLUMN     "administradoresCampus" TEXT,
ADD COLUMN     "lideresVoluntarios" TEXT,
ADD COLUMN     "pastores" TEXT;

-- CreateTable
CREATE TABLE "EncargadoArea" (
    "id" TEXT NOT NULL,
    "semanaId" TEXT NOT NULL,
    "encuentro" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,

    CONSTRAINT "EncargadoArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EncargadoArea_semanaId_encuentro_areaId_key" ON "EncargadoArea"("semanaId", "encuentro", "areaId");

-- AddForeignKey
ALTER TABLE "EncargadoArea" ADD CONSTRAINT "EncargadoArea_semanaId_fkey" FOREIGN KEY ("semanaId") REFERENCES "SemanaServicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncargadoArea" ADD CONSTRAINT "EncargadoArea_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AreaServicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

