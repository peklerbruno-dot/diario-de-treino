-- AlterTable
ALTER TABLE "Foto" ADD COLUMN     "padraoId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Registro" ADD COLUMN     "padraoId" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "RefeicaoPadrao" (
    "id" TEXT NOT NULL,
    "refeicao" TEXT NOT NULL DEFAULT '',
    "titulo" TEXT NOT NULL,
    "itens" TEXT NOT NULL DEFAULT '',
    "calorias" INTEGER,
    "proteinas" INTEGER,
    "carboidratos" INTEGER,
    "gorduras" INTEGER,
    "seguePlano" BOOLEAN NOT NULL DEFAULT true,
    "vezes" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefeicaoPadrao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RefeicaoPadrao_refeicao_idx" ON "RefeicaoPadrao"("refeicao");

