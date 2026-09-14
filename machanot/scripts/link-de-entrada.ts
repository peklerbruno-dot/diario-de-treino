/**
 * Gera um link de entrada pela linha de comando, sem depender de e-mail.
 * Útil no primeiro acesso e quando o provedor de e-mail estiver fora.
 *
 *   npx tsx scripts/link-de-entrada.ts coordenacao@chazit.org.br http://localhost:3000
 */
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  const origem = (process.argv[3] ?? "http://localhost:3000").replace(/\/$/, "");
  if (!email) {
    console.error("uso: npx tsx scripts/link-de-entrada.ts <email> [origem]");
    process.exit(1);
  }

  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  const token = randomBytes(32).toString("base64url");
  await prisma.tokenAcesso.create({
    data: {
      usuarioId: usuario.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiraEm: new Date(Date.now() + 1000 * 60 * 15),
    },
  });

  console.log(`${origem}/entrar/${token}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
