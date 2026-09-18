-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('COORDENACAO', 'MEMBRO');

-- CreateEnum
CREATE TYPE "TipoDeAtividade" AS ENUM ('PALESTRA', 'CURSO', 'OFICINA', 'WORKSHOP', 'CONGRESSO', 'SIMPOSIO', 'SEMINARIO', 'MESA_REDONDA', 'GRUPO_DE_ESTUDOS', 'LANCAMENTO_DE_LIVRO', 'MOSTRA', 'OUTRA');

-- CreateEnum
CREATE TYPE "EstadoDaAtividade" AS ENUM ('IDEIA', 'APROVADA', 'EM_PREPARACAO', 'DIVULGACAO', 'REALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoDaReuniao" AS ENUM ('AGENDADA', 'REALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoDoEncaminhamento" AS ENUM ('ABERTO', 'FEITO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Pessoa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'MEMBRO',
    "senha" TEXT,
    "convite" TEXT,
    "conviteExpiraEm" TIMESTAMP(3),
    "chaveDaAgenda" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "ultimoAcesso" TIMESTAMP(3),

    CONSTRAINT "Pessoa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atividade" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" "TipoDeAtividade" NOT NULL,
    "estado" "EstadoDaAtividade" NOT NULL DEFAULT 'IDEIA',
    "dia" TEXT NOT NULL,
    "hora" TEXT,
    "diaFinal" TEXT,
    "horaFinal" TEXT,
    "local" TEXT,
    "resumo" TEXT,
    "parceria" TEXT,
    "publicoAlvo" TEXT,
    "pastaNoDrive" TEXT,
    "linkDeInscricao" TEXT,
    "linkDaDivulgacao" TEXT,
    "publicoPresente" INTEGER,
    "avaliacao" TEXT,
    "responsavelId" TEXT,
    "googleEventoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "apagadaEm" TIMESTAMP(3),

    CONSTRAINT "Atividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Convidado" (
    "id" TEXT NOT NULL,
    "atividadeId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "instituicao" TEXT,
    "funcao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Convidado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reuniao" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "estado" "EstadoDaReuniao" NOT NULL DEFAULT 'AGENDADA',
    "dia" TEXT NOT NULL,
    "hora" TEXT,
    "local" TEXT,
    "pauta" TEXT,
    "ata" TEXT,
    "convocouId" TEXT,
    "googleEventoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "apagadaEm" TIMESTAMP(3),

    CONSTRAINT "Reuniao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presenca" (
    "reuniaoId" TEXT NOT NULL,
    "pessoaId" TEXT NOT NULL,
    "compareceu" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Presenca_pkey" PRIMARY KEY ("reuniaoId","pessoaId")
);

-- CreateTable
CREATE TABLE "Encaminhamento" (
    "id" TEXT NOT NULL,
    "oQue" TEXT NOT NULL,
    "estado" "EstadoDoEncaminhamento" NOT NULL DEFAULT 'ABERTO',
    "responsavelId" TEXT,
    "prazo" TEXT,
    "reuniaoId" TEXT,
    "atividadeId" TEXT,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "concluidoEm" TIMESTAMP(3),
    "apagadoEm" TIMESTAMP(3),

    CONSTRAINT "Encaminhamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pessoa_email_key" ON "Pessoa"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Pessoa_chaveDaAgenda_key" ON "Pessoa"("chaveDaAgenda");

-- CreateIndex
CREATE INDEX "Pessoa_ativa_idx" ON "Pessoa"("ativa");

-- CreateIndex
CREATE INDEX "Atividade_dia_idx" ON "Atividade"("dia");

-- CreateIndex
CREATE INDEX "Atividade_estado_idx" ON "Atividade"("estado");

-- CreateIndex
CREATE INDEX "Atividade_apagadaEm_idx" ON "Atividade"("apagadaEm");

-- CreateIndex
CREATE INDEX "Convidado_atividadeId_idx" ON "Convidado"("atividadeId");

-- CreateIndex
CREATE INDEX "Reuniao_dia_idx" ON "Reuniao"("dia");

-- CreateIndex
CREATE INDEX "Reuniao_apagadaEm_idx" ON "Reuniao"("apagadaEm");

-- CreateIndex
CREATE INDEX "Presenca_pessoaId_idx" ON "Presenca"("pessoaId");

-- CreateIndex
CREATE INDEX "Encaminhamento_responsavelId_estado_idx" ON "Encaminhamento"("responsavelId", "estado");

-- CreateIndex
CREATE INDEX "Encaminhamento_prazo_idx" ON "Encaminhamento"("prazo");

-- CreateIndex
CREATE INDEX "Encaminhamento_apagadoEm_idx" ON "Encaminhamento"("apagadoEm");

-- AddForeignKey
ALTER TABLE "Atividade" ADD CONSTRAINT "Atividade_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convidado" ADD CONSTRAINT "Convidado_atividadeId_fkey" FOREIGN KEY ("atividadeId") REFERENCES "Atividade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reuniao" ADD CONSTRAINT "Reuniao_convocouId_fkey" FOREIGN KEY ("convocouId") REFERENCES "Pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presenca" ADD CONSTRAINT "Presenca_reuniaoId_fkey" FOREIGN KEY ("reuniaoId") REFERENCES "Reuniao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presenca" ADD CONSTRAINT "Presenca_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encaminhamento" ADD CONSTRAINT "Encaminhamento_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encaminhamento" ADD CONSTRAINT "Encaminhamento_reuniaoId_fkey" FOREIGN KEY ("reuniaoId") REFERENCES "Reuniao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encaminhamento" ADD CONSTRAINT "Encaminhamento_atividadeId_fkey" FOREIGN KEY ("atividadeId") REFERENCES "Atividade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

