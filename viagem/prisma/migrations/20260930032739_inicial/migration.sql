-- CreateTable
CREATE TABLE "Pessoa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "chaveDoAtalho" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoAcesso" TIMESTAMP(3),

    CONSTRAINT "Pessoa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Viagem" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "destino" TEXT NOT NULL DEFAULT '',
    "inicio" TEXT NOT NULL,
    "fim" TEXT NOT NULL,
    "moedaBase" TEXT NOT NULL DEFAULT 'BRL',
    "cambios" JSONB NOT NULL DEFAULT '{}',
    "convite" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Viagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membro" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "pessoaId" TEXT,
    "organiza" BOOLEAN NOT NULL DEFAULT false,
    "cor" TEXT NOT NULL DEFAULT '#d9376e',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saiuEm" TIMESTAMP(3),

    CONSTRAINT "Membro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pasta" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '📍',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pasta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lugar" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "pastaId" TEXT,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'outro',
    "cidade" TEXT NOT NULL DEFAULT '',
    "endereco" TEXT NOT NULL DEFAULT '',
    "descricao" TEXT NOT NULL DEFAULT '',
    "dicas" TEXT NOT NULL DEFAULT '',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "googlePlaceId" TEXT,
    "fonte" TEXT NOT NULL DEFAULT '',
    "fomos" BOOLEAN NOT NULL DEFAULT false,
    "adicionadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apagadoEm" TIMESTAMP(3),

    CONSTRAINT "Lugar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voto" (
    "lugarId" TEXT NOT NULL,
    "membroId" TEXT NOT NULL,

    CONSTRAINT "Voto_pkey" PRIMARY KEY ("lugarId","membroId")
);

-- CreateTable
CREATE TABLE "Importacao" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "membroId" TEXT,
    "origem" TEXT NOT NULL,
    "entrada" TEXT NOT NULL DEFAULT '',
    "estado" TEXT NOT NULL DEFAULT 'pendente',
    "sugestoes" JSONB NOT NULL DEFAULT '[]',
    "observacao" TEXT NOT NULL DEFAULT '',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Importacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemRoteiro" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "dia" TEXT NOT NULL,
    "hora" TEXT NOT NULL DEFAULT '',
    "titulo" TEXT NOT NULL,
    "notas" TEXT NOT NULL DEFAULT '',
    "lugarId" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemRoteiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Despesa" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'outro',
    "data" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "moeda" TEXT NOT NULL,
    "cambio" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "modo" TEXT NOT NULL DEFAULT 'igual',
    "notas" TEXT NOT NULL DEFAULT '',
    "criadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apagadoEm" TIMESTAMP(3),

    CONSTRAINT "Despesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagadorDespesa" (
    "despesaId" TEXT NOT NULL,
    "membroId" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,

    CONSTRAINT "PagadorDespesa_pkey" PRIMARY KEY ("despesaId","membroId")
);

-- CreateTable
CREATE TABLE "ParteDespesa" (
    "despesaId" TEXT NOT NULL,
    "membroId" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ParteDespesa_pkey" PRIMARY KEY ("despesaId","membroId")
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "deId" TEXT NOT NULL,
    "paraId" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "notas" TEXT NOT NULL DEFAULT '',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apagadoEm" TIMESTAMP(3),

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pessoa_email_key" ON "Pessoa"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Pessoa_chaveDoAtalho_key" ON "Pessoa"("chaveDoAtalho");

-- CreateIndex
CREATE UNIQUE INDEX "Viagem_convite_key" ON "Viagem"("convite");

-- CreateIndex
CREATE INDEX "Membro_viagemId_idx" ON "Membro"("viagemId");

-- CreateIndex
CREATE UNIQUE INDEX "Membro_viagemId_pessoaId_key" ON "Membro"("viagemId", "pessoaId");

-- CreateIndex
CREATE INDEX "Pasta_viagemId_idx" ON "Pasta"("viagemId");

-- CreateIndex
CREATE INDEX "Lugar_viagemId_apagadoEm_idx" ON "Lugar"("viagemId", "apagadoEm");

-- CreateIndex
CREATE INDEX "Importacao_viagemId_estado_idx" ON "Importacao"("viagemId", "estado");

-- CreateIndex
CREATE INDEX "ItemRoteiro_viagemId_dia_idx" ON "ItemRoteiro"("viagemId", "dia");

-- CreateIndex
CREATE INDEX "Despesa_viagemId_apagadoEm_idx" ON "Despesa"("viagemId", "apagadoEm");

-- CreateIndex
CREATE INDEX "Pagamento_viagemId_apagadoEm_idx" ON "Pagamento"("viagemId", "apagadoEm");

-- AddForeignKey
ALTER TABLE "Membro" ADD CONSTRAINT "Membro_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "Viagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membro" ADD CONSTRAINT "Membro_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pasta" ADD CONSTRAINT "Pasta_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "Viagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lugar" ADD CONSTRAINT "Lugar_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "Viagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lugar" ADD CONSTRAINT "Lugar_pastaId_fkey" FOREIGN KEY ("pastaId") REFERENCES "Pasta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lugar" ADD CONSTRAINT "Lugar_adicionadoPorId_fkey" FOREIGN KEY ("adicionadoPorId") REFERENCES "Membro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voto" ADD CONSTRAINT "Voto_lugarId_fkey" FOREIGN KEY ("lugarId") REFERENCES "Lugar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voto" ADD CONSTRAINT "Voto_membroId_fkey" FOREIGN KEY ("membroId") REFERENCES "Membro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Importacao" ADD CONSTRAINT "Importacao_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "Viagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemRoteiro" ADD CONSTRAINT "ItemRoteiro_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "Viagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemRoteiro" ADD CONSTRAINT "ItemRoteiro_lugarId_fkey" FOREIGN KEY ("lugarId") REFERENCES "Lugar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "Viagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Membro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagadorDespesa" ADD CONSTRAINT "PagadorDespesa_despesaId_fkey" FOREIGN KEY ("despesaId") REFERENCES "Despesa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagadorDespesa" ADD CONSTRAINT "PagadorDespesa_membroId_fkey" FOREIGN KEY ("membroId") REFERENCES "Membro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParteDespesa" ADD CONSTRAINT "ParteDespesa_despesaId_fkey" FOREIGN KEY ("despesaId") REFERENCES "Despesa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParteDespesa" ADD CONSTRAINT "ParteDespesa_membroId_fkey" FOREIGN KEY ("membroId") REFERENCES "Membro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "Viagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_deId_fkey" FOREIGN KEY ("deId") REFERENCES "Membro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_paraId_fkey" FOREIGN KEY ("paraId") REFERENCES "Membro"("id") ON DELETE CASCADE ON UPDATE CASCADE;
