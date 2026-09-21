-- CreateEnum
CREATE TYPE "VinculoDoContato" AS ENUM ('GRADUACAO', 'POS_GRADUACAO', 'DOCENTE', 'FUNCIONARIO', 'EGRESSO', 'COMUNIDADE_EXTERNA', 'IMPRENSA', 'PARCEIRO', 'OUTRO');

-- CreateEnum
CREATE TYPE "EstadoDoContato" AS ENUM ('ATIVO', 'DESCADASTRADO', 'INVALIDO');

-- CreateEnum
CREATE TYPE "EstadoDoBoletim" AS ENUM ('RASCUNHO', 'ENVIANDO', 'ENVIADO');

-- CreateEnum
CREATE TYPE "EstadoDoEnvio" AS ENUM ('PENDENTE', 'ENVIADO', 'FALHOU');

-- AlterTable
ALTER TABLE "Atividade" ADD COLUMN     "chavePublica" TEXT,
ADD COLUMN     "inscricaoAberta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vagas" INTEGER;

-- CreateTable
CREATE TABLE "Contato" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "vinculo" "VinculoDoContato" NOT NULL DEFAULT 'OUTRO',
    "instituicao" TEXT,
    "origem" TEXT,
    "observacao" TEXT,
    "estado" "EstadoDoContato" NOT NULL DEFAULT 'ATIVO',
    "consentimentoEm" TIMESTAMP(3),
    "chave" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "apagadoEm" TIMESTAMP(3),

    CONSTRAINT "Contato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Etiqueta" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Etiqueta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtiquetaNoContato" (
    "etiquetaId" TEXT NOT NULL,
    "contatoId" TEXT NOT NULL,

    CONSTRAINT "EtiquetaNoContato_pkey" PRIMARY KEY ("etiquetaId","contatoId")
);

-- CreateTable
CREATE TABLE "Participacao" (
    "id" TEXT NOT NULL,
    "contatoId" TEXT NOT NULL,
    "atividadeId" TEXT NOT NULL,
    "inscritoEm" TIMESTAMP(3),
    "compareceu" BOOLEAN NOT NULL DEFAULT false,
    "chaveDoCertificado" TEXT NOT NULL,

    CONSTRAINT "Participacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Boletim" (
    "id" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "corpo" TEXT NOT NULL DEFAULT '',
    "estado" "EstadoDoBoletim" NOT NULL DEFAULT 'RASCUNHO',
    "filtroVinculo" TEXT,
    "filtroEtiquetaId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadoEm" TIMESTAMP(3),

    CONSTRAINT "Boletim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtividadeNoBoletim" (
    "boletimId" TEXT NOT NULL,
    "atividadeId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AtividadeNoBoletim_pkey" PRIMARY KEY ("boletimId","atividadeId")
);

-- CreateTable
CREATE TABLE "EnvioDeBoletim" (
    "id" TEXT NOT NULL,
    "boletimId" TEXT NOT NULL,
    "contatoId" TEXT NOT NULL,
    "estado" "EstadoDoEnvio" NOT NULL DEFAULT 'PENDENTE',
    "erro" TEXT,
    "enviadoEm" TIMESTAMP(3),

    CONSTRAINT "EnvioDeBoletim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contato_email_key" ON "Contato"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Contato_chave_key" ON "Contato"("chave");

-- CreateIndex
CREATE INDEX "Contato_estado_idx" ON "Contato"("estado");

-- CreateIndex
CREATE INDEX "Contato_apagadoEm_idx" ON "Contato"("apagadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "Etiqueta_nome_key" ON "Etiqueta"("nome");

-- CreateIndex
CREATE INDEX "EtiquetaNoContato_contatoId_idx" ON "EtiquetaNoContato"("contatoId");

-- CreateIndex
CREATE UNIQUE INDEX "Participacao_chaveDoCertificado_key" ON "Participacao"("chaveDoCertificado");

-- CreateIndex
CREATE INDEX "Participacao_atividadeId_idx" ON "Participacao"("atividadeId");

-- CreateIndex
CREATE UNIQUE INDEX "Participacao_contatoId_atividadeId_key" ON "Participacao"("contatoId", "atividadeId");

-- CreateIndex
CREATE INDEX "EnvioDeBoletim_boletimId_estado_idx" ON "EnvioDeBoletim"("boletimId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "EnvioDeBoletim_boletimId_contatoId_key" ON "EnvioDeBoletim"("boletimId", "contatoId");

-- CreateIndex
CREATE UNIQUE INDEX "Atividade_chavePublica_key" ON "Atividade"("chavePublica");

-- AddForeignKey
ALTER TABLE "EtiquetaNoContato" ADD CONSTRAINT "EtiquetaNoContato_etiquetaId_fkey" FOREIGN KEY ("etiquetaId") REFERENCES "Etiqueta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtiquetaNoContato" ADD CONSTRAINT "EtiquetaNoContato_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "Contato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participacao" ADD CONSTRAINT "Participacao_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "Contato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participacao" ADD CONSTRAINT "Participacao_atividadeId_fkey" FOREIGN KEY ("atividadeId") REFERENCES "Atividade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtividadeNoBoletim" ADD CONSTRAINT "AtividadeNoBoletim_boletimId_fkey" FOREIGN KEY ("boletimId") REFERENCES "Boletim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtividadeNoBoletim" ADD CONSTRAINT "AtividadeNoBoletim_atividadeId_fkey" FOREIGN KEY ("atividadeId") REFERENCES "Atividade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvioDeBoletim" ADD CONSTRAINT "EnvioDeBoletim_boletimId_fkey" FOREIGN KEY ("boletimId") REFERENCES "Boletim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvioDeBoletim" ADD CONSTRAINT "EnvioDeBoletim_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "Contato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

