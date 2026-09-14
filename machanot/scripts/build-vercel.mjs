/**
 * Build na Vercel.
 *
 * As migrações do banco só rodam no deploy de produção. Isso importa porque o
 * banco é um só: um deploy de pré-visualização (o que a Vercel cria para cada
 * pull request) aplicava a migração no banco de produção antes de o código novo
 * estar no ar — e o código velho, ainda servindo o site, quebrava ao procurar
 * uma tabela que a migração tinha acabado de apagar.
 *
 * Agora a pré-visualização só compila. Quem mexe no banco é a produção, junto
 * com o código que precisa daquela mudança.
 */
import { execSync } from "node:child_process";

const rodar = (comando) => execSync(comando, { stdio: "inherit" });

if (process.env.VERCEL_ENV === "production") {
  rodar("prisma migrate deploy");
} else {
  console.log(
    `[build] VERCEL_ENV=${process.env.VERCEL_ENV ?? "(vazio)"} — migrações não aplicadas.\n` +
      "[build] Só o deploy de produção altera o banco.",
  );
}

rodar("next build");
