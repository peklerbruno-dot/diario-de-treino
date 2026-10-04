import "server-only";
import webpush from "web-push";
import { bd } from "./bd";

/**
 * Avisos no celular, pelo web push — o mesmo canal das notificações de apps,
 * sem custo e sem serviço de terceiros. No iPhone funciona com o app
 * instalado na tela de início (iOS 16.4 ou mais novo).
 *
 * As chaves VAPID (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) identificam este
 * servidor para os serviços de push da Apple e do Google. Sem elas, nenhum
 * aviso sai e nada mais quebra.
 */

export type Aviso = { titulo: string; corpo: string; url: string; marca?: string };

export const chavePublica = () => process.env.VAPID_PUBLIC_KEY ?? "";
export const avisosLigados = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let configurado = false;
function configurar() {
  if (configurado) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:viagem@example.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configurado = true;
}

/** Manda para todos os aparelhos das pessoas dadas. Falha de um não segura os outros. */
export async function avisarPessoas(pessoaIds: string[], aviso: Aviso): Promise<void> {
  if (!avisosLigados() || pessoaIds.length === 0) return;
  configurar();
  const inscricoes = await bd.inscricaoPush.findMany({ where: { pessoaId: { in: [...new Set(pessoaIds)] } } });
  const carga = JSON.stringify(aviso);
  const mortas: string[] = [];
  await Promise.allSettled(
    inscricoes.map(async (i) => {
      try {
        await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, carga, {
          TTL: 60 * 60 * 12,
          timeout: 8000,
        });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // 404/410: o aparelho cancelou ou o app foi removido. A inscrição morreu.
        if (status === 404 || status === 410) mortas.push(i.id);
        else console.error("[avisos]", status, (e as Error).message);
      }
    }),
  );
  if (mortas.length) await bd.inscricaoPush.deleteMany({ where: { id: { in: mortas } } });
}

/**
 * Avisa a viagem. `para` restringe a alguns membros; `exceto` tira quem fez a
 * ação — ninguém precisa ser avisado do que acabou de fazer.
 */
export async function avisarViagem(
  viagemId: string,
  aviso: Aviso,
  { para, exceto }: { para?: string[]; exceto?: string } = {},
): Promise<void> {
  if (!avisosLigados()) return;
  const membros = await bd.membro.findMany({
    where: { viagemId, saiuEm: null, pessoaId: { not: null }, ...(para ? { id: { in: para } } : {}) },
    select: { id: true, pessoaId: true },
  });
  await avisarPessoas(
    membros.filter((m) => m.id !== exceto).map((m) => m.pessoaId!),
    aviso,
  );
}
