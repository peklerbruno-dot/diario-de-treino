-- AlterTable
ALTER TABLE "Registro" ADD COLUMN     "hora" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "humor" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "FotoCorpo" (
    "id" TEXT NOT NULL,
    "dia" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "imagem" BYTEA NOT NULL,
    "nota" TEXT NOT NULL DEFAULT '',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoCorpo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FotoCorpo_dia_idx" ON "FotoCorpo"("dia");
