-- AlterTable
ALTER TABLE "Conversa" ADD COLUMN     "eventoFim" TIMESTAMP(3),
ADD COLUMN     "eventoInicio" TIMESTAMP(3),
ADD COLUMN     "eventoTitulo" TEXT;

-- CreateTable
CREATE TABLE "Ajuste" (
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "Ajuste_pkey" PRIMARY KEY ("chave")
);

-- CreateTable
CREATE TABLE "Contato" (
    "email" TEXT NOT NULL,
    "nota" TEXT NOT NULL DEFAULT '',
    "atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contato_pkey" PRIMARY KEY ("email")
);
