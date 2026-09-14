-- CreateEnum
CREATE TYPE "TipoMachane" AS ENUM ('KAITZ', 'CHOREF');

-- CreateEnum
CREATE TYPE "StatusMachane" AS ENUM ('RASCUNHO', 'EM_REVISAO', 'PUBLICADA', 'ENCERRADA');

-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('CHANICH', 'MADRICH', 'PT', 'EQUIPE', 'PRESTADOR');

-- CreateEnum
CREATE TYPE "Turma" AS ENUM ('GRANDES', 'PEQUENOS');

-- CreateEnum
CREATE TYPE "TipoGasto" AS ENUM ('VALOR_FECHADO', 'POR_PESSOA', 'POR_DIARIA', 'CACHE_DIARIO');

-- CreateEnum
CREATE TYPE "CategoriaGasto" AS ENUM ('TRANSPORTE', 'ALIMENTACAO', 'SAUDE', 'SEGURANCA', 'MATERIAL', 'BOLSA', 'ESTRUTURA', 'OUTROS');

-- CreateEnum
CREATE TYPE "MetodoPreco" AS ENUM ('ADITIVO', 'MULTIPLICATIVO');

-- CreateEnum
CREATE TYPE "Arredondamento" AS ENUM ('NENHUM', 'DEZ', 'CINQUENTA', 'CEM');

-- CreateEnum
CREATE TYPE "AlvoAlteracao" AS ENUM ('MACHANE', 'PESO', 'POLITICA', 'CATEGORIA', 'GASTO', 'MADRICH', 'PAGAMENTO', 'STATUS', 'DUPLICACAO');

-- CreateTable
CREATE TABLE "Machane" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoMachane" NOT NULL,
    "ano" INTEGER NOT NULL,
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "diariaCents" INTEGER NOT NULL,
    "diariaTabelaCents" INTEGER,
    "diariaObservacao" TEXT,
    "diasGrandes" INTEGER NOT NULL DEFAULT 6,
    "diasPequenos" INTEGER NOT NULL DEFAULT 4,
    "pesoOverride" DOUBLE PRECISION,
    "pesoJustificativa" TEXT,
    "pesoOverridePor" TEXT,
    "pesoOverrideEm" TIMESTAMP(3),
    "receitaMadrichimRealCents" INTEGER,
    "status" "StatusMachane" NOT NULL DEFAULT 'RASCUNHO',
    "duplicadaDeId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machane_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "machaneId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "papel" "Papel" NOT NULL,
    "turma" "Turma" NOT NULL,
    "dias" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "geraHospedagem" BOOLEAN NOT NULL DEFAULT true,
    "contribuicaoCents" INTEGER NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GastoFixo" (
    "id" TEXT NOT NULL,
    "machaneId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" "TipoGasto" NOT NULL,
    "categoria" "CategoriaGasto" NOT NULL,
    "valorCents" INTEGER NOT NULL,
    "pessoas" INTEGER,
    "dias" INTEGER,
    "observacao" TEXT NOT NULL,
    "revisado" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GastoFixo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoliticaPreco" (
    "id" TEXT NOT NULL,
    "machaneId" TEXT NOT NULL,
    "metodo" "MetodoPreco" NOT NULL,
    "margemBaseGrandesCents" INTEGER,
    "margemBasePequenosCents" INTEGER,
    "acrescimoNaoSocioCents" INTEGER,
    "descontoSegundoFilhoCents" INTEGER,
    "margemBasePct" DOUBLE PRECISION,
    "acrescimoNaoSocioPct" DOUBLE PRECISION,
    "descontoSegundoFilhoPct" DOUBLE PRECISION,
    "descontoSegundoFilhoGrandesCents" INTEGER,
    "descontoSegundoFilhoPequenosCents" INTEGER,
    "descontoSegundoFilhoGrandesPct" DOUBLE PRECISION,
    "descontoSegundoFilhoPequenosPct" DOUBLE PRECISION,
    "acrescimoSegundaLevaCents" INTEGER NOT NULL DEFAULT 10000,
    "superavitAlvoCents" INTEGER NOT NULL DEFAULT 0,
    "arredondamento" "Arredondamento" NOT NULL DEFAULT 'NENHUM',

    CONSTRAINT "PoliticaPreco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Madrich" (
    "id" TEXT NOT NULL,
    "machaneId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "kvutza" TEXT,
    "turma" "Turma" NOT NULL,
    "valorDevidoCents" INTEGER NOT NULL,
    "bolsaCents" INTEGER NOT NULL DEFAULT 0,
    "parcelas" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Madrich_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagamentoMadrich" (
    "id" TEXT NOT NULL,
    "madrichId" TEXT NOT NULL,
    "valorCents" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT,

    CONSTRAINT "PagamentoMadrich_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoAcessoEm" TIMESTAMP(3),

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenAcesso" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenAcesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroAlteracao" (
    "id" TEXT NOT NULL,
    "machaneId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "alvo" "AlvoAlteracao" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valorAntes" TEXT,
    "valorDepois" TEXT,
    "justificativa" TEXT,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAlteracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Machane_ano_tipo_idx" ON "Machane"("ano", "tipo");

-- CreateIndex
CREATE INDEX "Categoria_machaneId_idx" ON "Categoria"("machaneId");

-- CreateIndex
CREATE INDEX "GastoFixo_machaneId_idx" ON "GastoFixo"("machaneId");

-- CreateIndex
CREATE UNIQUE INDEX "PoliticaPreco_machaneId_key" ON "PoliticaPreco"("machaneId");

-- CreateIndex
CREATE INDEX "Madrich_machaneId_idx" ON "Madrich"("machaneId");

-- CreateIndex
CREATE INDEX "PagamentoMadrich_madrichId_idx" ON "PagamentoMadrich"("madrichId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TokenAcesso_tokenHash_key" ON "TokenAcesso"("tokenHash");

-- CreateIndex
CREATE INDEX "TokenAcesso_usuarioId_idx" ON "TokenAcesso"("usuarioId");

-- CreateIndex
CREATE INDEX "RegistroAlteracao_machaneId_em_idx" ON "RegistroAlteracao"("machaneId", "em");

-- AddForeignKey
ALTER TABLE "Machane" ADD CONSTRAINT "Machane_duplicadaDeId_fkey" FOREIGN KEY ("duplicadaDeId") REFERENCES "Machane"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_machaneId_fkey" FOREIGN KEY ("machaneId") REFERENCES "Machane"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastoFixo" ADD CONSTRAINT "GastoFixo_machaneId_fkey" FOREIGN KEY ("machaneId") REFERENCES "Machane"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoliticaPreco" ADD CONSTRAINT "PoliticaPreco_machaneId_fkey" FOREIGN KEY ("machaneId") REFERENCES "Machane"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Madrich" ADD CONSTRAINT "Madrich_machaneId_fkey" FOREIGN KEY ("machaneId") REFERENCES "Machane"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoMadrich" ADD CONSTRAINT "PagamentoMadrich_madrichId_fkey" FOREIGN KEY ("madrichId") REFERENCES "Madrich"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenAcesso" ADD CONSTRAINT "TokenAcesso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAlteracao" ADD CONSTRAINT "RegistroAlteracao_machaneId_fkey" FOREIGN KEY ("machaneId") REFERENCES "Machane"("id") ON DELETE CASCADE ON UPDATE CASCADE;
