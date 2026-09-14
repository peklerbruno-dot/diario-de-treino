/**
 * Build na Vercel.
 *
 * Duas decisões, cada uma por causa de um problema que já aconteceu:
 *
 * 1. As migrações só rodam no deploy de produção. O banco é um só: um deploy
 *    de pré-visualização (o que a Vercel cria para cada pull request) aplicava
 *    a migração no banco antes de o código novo estar no ar — e o código
 *    velho, ainda servindo o site, quebrava ao procurar uma tabela que a
 *    migração tinha acabado de apagar.
 *
 * 2. A migração é tentada mais de uma vez. O banco do Neon adormece quando
 *    ninguém usa, e a primeira conexão de um build acorda-o: se ela chega antes
 *    de ele estar de pé, o build falha em segundos e a publicação inteira vai
 *    junto — foi o que derrubou o site duas vezes, e o que fazia um "Redeploy"
 *    minutos depois funcionar sem que nada tivesse mudado.
 */
import { execSync } from "node:child_process";

// `npx` em vez do nome cru: assim o binário local é encontrado mesmo quando o
// script não é chamado pelo npm (foi assim que um "command not found" se
// disfarçou de "banco inacessível" num teste).
const rodar = (comando) => execSync(`npx --no-install ${comando}`, { stdio: "inherit" });
const esperar = (segundos) => execSync(`sleep ${segundos}`);

const TENTATIVAS = 4;
const ESPERA_SEGUNDOS = 10;

function migrarComPaciencia() {
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      rodar("prisma migrate deploy");
      return;
    } catch (erro) {
      if (tentativa === TENTATIVAS) {
        console.error(
          `[build] A migração falhou ${TENTATIVAS} vezes. O erro do Prisma está acima:\n` +
            "[build] P1001 = não alcançou o banco (confira o DATABASE_URL e se o banco está de pé).\n" +
            "[build] P3009 = há uma migração marcada como falha; resolva antes de publicar.",
        );
        throw erro;
      }
      console.log(
        `[build] Migração falhou na tentativa ${tentativa} de ${TENTATIVAS}. ` +
          `Provavelmente o banco ainda está acordando; nova tentativa em ${ESPERA_SEGUNDOS}s.`,
      );
      esperar(ESPERA_SEGUNDOS);
    }
  }
}

if (process.env.VERCEL_ENV === "production") {
  migrarComPaciencia();
} else {
  console.log(
    `[build] VERCEL_ENV=${process.env.VERCEL_ENV ?? "(vazio)"} — migrações não aplicadas.\n` +
      "[build] Só o deploy de produção altera o banco.",
  );
}

rodar("next build");
