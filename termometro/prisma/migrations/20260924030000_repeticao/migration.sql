-- Quando um fixo acontece, quando a regra não é um dia do mês.
--
-- Nula por padrão, e é isso que faz a migração ser segura: todo fixo que já
-- existe continua lendo o campo `dia`, sem nenhuma linha reescrita.
ALTER TABLE "Fixo" ADD COLUMN "repeticao" TEXT;
