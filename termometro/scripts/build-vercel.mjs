/**
 * Build na Vercel — o mesmo cuidado que o machanot já pagou para aprender:
 *
 * 1. As migrações só rodam no deploy de produção. Um deploy de pré-visualização
 *    mexendo no banco derruba o site que está no ar.
 * 2. A migração é tentada mais de uma vez: o banco do Neon adormece, e a
 *    primeira conexão do build é quem o acorda.
 */
import { execSync } from "node:child_process";

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
            "[build] P1001 = não alcançou o banco (confira o DATABASE_URL).\n" +
            "[build] P3009 = há uma migração marcada como falha; resolva antes de publicar.",
        );
        throw erro;
      }
      console.log(
        `[build] Migração falhou na tentativa ${tentativa} de ${TENTATIVAS}; ` +
          `o banco provavelmente ainda está acordando. Nova tentativa em ${ESPERA_SEGUNDOS}s.`,
      );
      esperar(ESPERA_SEGUNDOS);
    }
  }
}

if (process.env.VERCEL_ENV === "production") {
  migrarComPaciencia();
} else {
  console.log(
    `[build] VERCEL_ENV=${process.env.VERCEL_ENV ?? "(vazio)"} — migrações não aplicadas.`,
  );
}

rodar("next build");
