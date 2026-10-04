-- Pessoas: o app deixa de ser de uma pessoa só.
--
-- Tudo o que já existe passa a ser do dono ("dono"), que continua entrando
-- com o CODIGO_DE_ACESSO de sempre. A coluna nasce com valor padrão só para
-- preencher as linhas antigas; o padrão sai logo depois, para nenhuma escrita
-- nova cair no dono por esquecimento.

CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigoHash" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Usuario_codigoHash_key" ON "Usuario"("codigoHash");

INSERT INTO "Usuario" ("id", "nome") VALUES ('dono', 'BP');

CREATE TABLE "Convite" (
    "token" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    CONSTRAINT "Convite_pkey" PRIMARY KEY ("token")
);
ALTER TABLE "Convite" ADD CONSTRAINT "Convite_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Lançamentos
ALTER TABLE "Lancamento" ADD COLUMN "usuarioId" TEXT NOT NULL DEFAULT 'dono';
ALTER TABLE "Lancamento" ALTER COLUMN "usuarioId" DROP DEFAULT;
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX IF EXISTS "Lancamento_servidorEm_idx";
DROP INDEX IF EXISTS "Lancamento_data_idx";
CREATE INDEX "Lancamento_usuarioId_servidorEm_idx" ON "Lancamento"("usuarioId", "servidorEm");
CREATE INDEX "Lancamento_usuarioId_data_idx" ON "Lancamento"("usuarioId", "data");

-- Fixos
ALTER TABLE "Fixo" ADD COLUMN "usuarioId" TEXT NOT NULL DEFAULT 'dono';
ALTER TABLE "Fixo" ALTER COLUMN "usuarioId" DROP DEFAULT;
ALTER TABLE "Fixo" ADD CONSTRAINT "Fixo_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX IF EXISTS "Fixo_servidorEm_idx";
CREATE INDEX "Fixo_usuarioId_servidorEm_idx" ON "Fixo"("usuarioId", "servidorEm");

-- Ajustes: a chave passa a ser (pessoa, chave)
ALTER TABLE "Ajuste" ADD COLUMN "usuarioId" TEXT NOT NULL DEFAULT 'dono';
ALTER TABLE "Ajuste" ALTER COLUMN "usuarioId" DROP DEFAULT;
ALTER TABLE "Ajuste" DROP CONSTRAINT "Ajuste_pkey";
ALTER TABLE "Ajuste" ADD CONSTRAINT "Ajuste_pkey" PRIMARY KEY ("usuarioId", "chave");
ALTER TABLE "Ajuste" ADD CONSTRAINT "Ajuste_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX IF EXISTS "Ajuste_servidorEm_idx";
CREATE INDEX "Ajuste_usuarioId_servidorEm_idx" ON "Ajuste"("usuarioId", "servidorEm");
