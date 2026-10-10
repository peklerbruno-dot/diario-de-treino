-- Compra no crédito: não mexe no saldo de agora, entra na fatura aberta.
ALTER TABLE "Lancamento" ADD COLUMN "credito" BOOLEAN NOT NULL DEFAULT false;
