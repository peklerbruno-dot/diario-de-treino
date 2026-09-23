-- CreateTable
CREATE TABLE "Bloco" (
    "chave" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "atualizadoPor" TEXT NOT NULL,

    CONSTRAINT "Bloco_pkey" PRIMARY KEY ("chave")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ordem" DOUBLE PRECISION NOT NULL,
    "dados" JSONB NOT NULL,
    "oculto" BOOLEAN NOT NULL DEFAULT false,
    "apagadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "atualizadoPor" TEXT NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Arquivo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "conteudo" BYTEA NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoPor" TEXT NOT NULL,

    CONSTRAINT "Arquivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alteracao" (
    "id" TEXT NOT NULL,
    "quando" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quem" TEXT NOT NULL,
    "oQue" TEXT NOT NULL,

    CONSTRAINT "Alteracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Item_tipo_apagadoEm_idx" ON "Item"("tipo", "apagadoEm");

-- CreateIndex
CREATE INDEX "Alteracao_quando_idx" ON "Alteracao"("quando");
