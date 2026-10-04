-- CreateTable
CREATE TABLE "Foto" (
    "id" TEXT NOT NULL,
    "dia" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "refeicaoId" TEXT,
    "nome" TEXT NOT NULL DEFAULT '',
    "tipo" TEXT NOT NULL,
    "imagem" BYTEA NOT NULL,
    "analise" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Foto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lembrete" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL DEFAULT '',
    "horario" TEXT NOT NULL,
    "dias" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lembrete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Foto_dia_idx" ON "Foto"("dia");

