-- Entrada por código de acesso: não há mais contas, e-mails nem links mágicos.
-- A coluna "email" de RegistroAlteracao continua existindo (agora chamada de
-- `autor` no código, via @map) para não perder o histórico de alterações.

-- DropForeignKey
ALTER TABLE "TokenAcesso" DROP CONSTRAINT "TokenAcesso_usuarioId_fkey";

-- DropTable
DROP TABLE "TokenAcesso";

-- DropTable
DROP TABLE "Usuario";
