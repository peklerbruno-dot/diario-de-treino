-- AlterTable
ALTER TABLE "Membro" ADD COLUMN     "pix" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Viagem" ADD COLUMN     "orcamento" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "InscricaoPush" (
    "id" TEXT NOT NULL,
    "pessoaId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InscricaoPush_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'outro',
    "notas" TEXT NOT NULL DEFAULT '',
    "nomeDoArquivo" TEXT NOT NULL DEFAULT '',
    "mime" TEXT NOT NULL DEFAULT '',
    "tamanho" INTEGER NOT NULL DEFAULT 0,
    "dados" BYTEA,
    "enviadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apagadoEm" TIMESTAMP(3),

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquete" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "pergunta" TEXT NOT NULL,
    "criadaPorId" TEXT,
    "encerrada" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enquete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpcaoEnquete" (
    "id" TEXT NOT NULL,
    "enqueteId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "lugarId" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OpcaoEnquete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotoEnquete" (
    "enqueteId" TEXT NOT NULL,
    "membroId" TEXT NOT NULL,
    "opcaoId" TEXT NOT NULL,

    CONSTRAINT "VotoEnquete_pkey" PRIMARY KEY ("enqueteId","membroId")
);

-- CreateTable
CREATE TABLE "Tarefa" (
    "id" TEXT NOT NULL,
    "viagemId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "responsavelId" TEXT,
    "prazo" TEXT NOT NULL DEFAULT '',
    "feita" BOOLEAN NOT NULL DEFAULT false,
    "feitaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InscricaoPush_endpoint_key" ON "InscricaoPush"("endpoint");

-- CreateIndex
CREATE INDEX "InscricaoPush_pessoaId_idx" ON "InscricaoPush"("pessoaId");

-- CreateIndex
CREATE INDEX "Documento_viagemId_apagadoEm_idx" ON "Documento"("viagemId", "apagadoEm");

-- CreateIndex
CREATE INDEX "Enquete_viagemId_idx" ON "Enquete"("viagemId");

-- CreateIndex
CREATE INDEX "Tarefa_viagemId_idx" ON "Tarefa"("viagemId");

-- AddForeignKey
ALTER TABLE "InscricaoPush" ADD CONSTRAINT "InscricaoPush_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "Viagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquete" ADD CONSTRAINT "Enquete_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "Viagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpcaoEnquete" ADD CONSTRAINT "OpcaoEnquete_enqueteId_fkey" FOREIGN KEY ("enqueteId") REFERENCES "Enquete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotoEnquete" ADD CONSTRAINT "VotoEnquete_enqueteId_fkey" FOREIGN KEY ("enqueteId") REFERENCES "Enquete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotoEnquete" ADD CONSTRAINT "VotoEnquete_opcaoId_fkey" FOREIGN KEY ("opcaoId") REFERENCES "OpcaoEnquete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotoEnquete" ADD CONSTRAINT "VotoEnquete_membroId_fkey" FOREIGN KEY ("membroId") REFERENCES "Membro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "Viagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Membro"("id") ON DELETE SET NULL ON UPDATE CASCADE;
