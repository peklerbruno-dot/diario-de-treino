-- CreateTable
CREATE TABLE "Medida" (
    "id" TEXT NOT NULL,
    "dia" TEXT NOT NULL,
    "pesoG" INTEGER,
    "cinturaMm" INTEGER,
    "quadrilMm" INTEGER,
    "bracoMm" INTEGER,
    "nota" TEXT NOT NULL DEFAULT '',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Medida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Semana" (
    "id" TEXT NOT NULL,
    "inicio" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "marcados" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Semana_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Medida_dia_idx" ON "Medida"("dia");

