-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Tipo" AS ENUM ('ENTRADA', 'SAIDA', 'DIARIO');

-- CreateTable
CREATE TABLE "Lancamento" (
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "tipo" "Tipo" NOT NULL,
    "valorCents" INTEGER NOT NULL,
    "nota" TEXT,
    "previsto" BOOLEAN NOT NULL DEFAULT false,
    "rendaPropria" BOOLEAN NOT NULL DEFAULT false,
    "investimento" BOOLEAN NOT NULL DEFAULT false,
    "apartamento" BOOLEAN NOT NULL DEFAULT false,
    "fixoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "apagadoEm" TIMESTAMP(3),
    "servidorEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lancamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fixo" (
    "id" TEXT NOT NULL,
    "tipo" "Tipo" NOT NULL,
    "dia" INTEGER NOT NULL,
    "valorCents" INTEGER NOT NULL,
    "nota" TEXT,
    "rendaPropria" BOOLEAN NOT NULL DEFAULT false,
    "investimento" BOOLEAN NOT NULL DEFAULT false,
    "apartamento" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "apagadoEm" TIMESTAMP(3),
    "servidorEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fixo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ajuste" (
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "servidorEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ajuste_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE INDEX "Lancamento_servidorEm_idx" ON "Lancamento"("servidorEm");

-- CreateIndex
CREATE INDEX "Lancamento_data_idx" ON "Lancamento"("data");

-- CreateIndex
CREATE INDEX "Fixo_servidorEm_idx" ON "Fixo"("servidorEm");

-- CreateIndex
CREATE INDEX "Ajuste_servidorEm_idx" ON "Ajuste"("servidorEm");

