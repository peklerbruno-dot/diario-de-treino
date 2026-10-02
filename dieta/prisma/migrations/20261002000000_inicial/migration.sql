-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Plano" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "orientacoes" TEXT NOT NULL DEFAULT '',
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refeicao" (
    "id" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "horario" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "conteudo" JSONB NOT NULL,
    "nota" TEXT NOT NULL DEFAULT '',
    "dias" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "avisar" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Refeicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registro" (
    "id" TEXT NOT NULL,
    "dia" TEXT NOT NULL,
    "refeicaoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "horario" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "nota" TEXT NOT NULL DEFAULT '',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Registro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agua" (
    "id" TEXT NOT NULL,
    "dia" TEXT NOT NULL,
    "ml" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agua_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aparelho" (
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "nome" TEXT NOT NULL DEFAULT '',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aparelho_pkey" PRIMARY KEY ("endpoint")
);

-- CreateTable
CREATE TABLE "AvisoEnviado" (
    "chave" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvisoEnviado_pkey" PRIMARY KEY ("chave")
);

-- CreateTable
CREATE TABLE "Ajuste" (
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "Ajuste_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE INDEX "Refeicao_planoId_idx" ON "Refeicao"("planoId");

-- CreateIndex
CREATE INDEX "Registro_dia_idx" ON "Registro"("dia");

-- CreateIndex
CREATE UNIQUE INDEX "Registro_dia_refeicaoId_key" ON "Registro"("dia", "refeicaoId");

-- CreateIndex
CREATE INDEX "Agua_dia_idx" ON "Agua"("dia");

-- AddForeignKey
ALTER TABLE "Refeicao" ADD CONSTRAINT "Refeicao_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "Plano"("id") ON DELETE CASCADE ON UPDATE CASCADE;

