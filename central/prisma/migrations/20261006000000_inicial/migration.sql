-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Conta" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "accessExpiraEm" TIMESTAMP(3),
    "estilo" TEXT,
    "erro" TEXT,
    "ultimaSincronia" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversa" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "remetente" TEXT NOT NULL,
    "remetenteEmail" TEXT NOT NULL,
    "trecho" TEXT NOT NULL,
    "ultimaData" TIMESTAMP(3) NOT NULL,
    "ultimaDeMim" BOOLEAN NOT NULL DEFAULT false,
    "ultimaMensagemId" TEXT NOT NULL,
    "classificadaMsgId" TEXT,
    "categoria" TEXT NOT NULL DEFAULT 'informativo',
    "prioridade" INTEGER NOT NULL DEFAULT 2,
    "resumo" TEXT NOT NULL DEFAULT '',
    "proximaAcao" TEXT NOT NULL DEFAULT '',
    "prazo" TIMESTAMP(3),
    "corrigida" BOOLEAN NOT NULL DEFAULT false,
    "resolvida" BOOLEAN NOT NULL DEFAULT false,
    "naCaixa" BOOLEAN NOT NULL DEFAULT true,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rascunho" (
    "id" TEXT NOT NULL,
    "conversaId" TEXT NOT NULL,
    "contexto" TEXT NOT NULL DEFAULT '',
    "texto" TEXT NOT NULL,
    "gmailDraftId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rascunho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instrucao" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Instrucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Correcao" (
    "id" TEXT NOT NULL,
    "remetenteEmail" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "de" TEXT NOT NULL,
    "para" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Correcao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conta_email_key" ON "Conta"("email");

-- CreateIndex
CREATE INDEX "Conversa_categoria_resolvida_idx" ON "Conversa"("categoria", "resolvida");

-- CreateIndex
CREATE UNIQUE INDEX "Conversa_contaId_threadId_key" ON "Conversa"("contaId", "threadId");

-- AddForeignKey
ALTER TABLE "Conversa" ADD CONSTRAINT "Conversa_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rascunho" ADD CONSTRAINT "Rascunho_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "Conversa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

