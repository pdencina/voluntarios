-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "debeCambiarPassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "expiraEn" TIMESTAMP(3),
ADD COLUMN     "sesionVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LoginIntento" ADD COLUMN     "ip" TEXT;

-- CreateIndex
CREATE INDEX "LoginIntento_ip_createdAt_idx" ON "LoginIntento"("ip", "createdAt");

