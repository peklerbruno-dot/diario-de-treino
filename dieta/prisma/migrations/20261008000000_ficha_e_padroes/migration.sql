-- AlterTable
ALTER TABLE "Registro" ADD COLUMN     "fome" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "obs" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Padrao" (
    "id" TEXT NOT NULL,
    "refeicao" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Padrao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Padrao_refeicao_idx" ON "Padrao"("refeicao");
