-- Para onde o dinheiro foi.
--
-- Nula por padrão, e é isso que faz esta migração ser segura nos 815
-- lançamentos que já existem: nenhuma linha precisa ser reescrita, nenhum valor
-- muda, e "sem categoria" continua sendo uma resposta legítima.
ALTER TABLE "Lancamento" ADD COLUMN "categoria" TEXT;
ALTER TABLE "Fixo" ADD COLUMN "categoria" TEXT;

-- A tela de totais agrupa por aqui.
CREATE INDEX "Lancamento_categoria_idx" ON "Lancamento"("categoria");
