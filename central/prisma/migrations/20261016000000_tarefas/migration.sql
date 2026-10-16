-- CreateTable
CREATE TABLE "Tarefa" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "prazo" TIMESTAMP(3),
    "feitaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tarefa_feitaEm_idx" ON "Tarefa"("feitaEm");
