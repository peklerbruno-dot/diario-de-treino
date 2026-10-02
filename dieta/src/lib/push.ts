import "server-only";
import webpush, { WebPushError } from "web-push";
import { bd } from "./bd";

/**
 * As notificações.
 *
 * É o Web Push padrão, o mesmo que o iPhone aceita desde o iOS 16.4 para apps
 * adicionados à Tela de Início. O servidor assina cada envio com um par de
 * chaves (VAPID) que é só deste app: a pública vai para o aparelho na hora de
 * pedir permissão, a privada fica na Vercel. `npm run chaves` gera o par.
 *
 * Quem entrega é o serviço de push do próprio aparelho (o da Apple, no iPhone).
 * Por isso funciona com o app fechado — o app não precisa estar aberto, nem em
 * segundo plano, para a notificação chegar.
 */

export type Envio = { titulo: string; corpo: string; url: string; tag?: string };

export const chavePublica = () => process.env.VAPID_PUBLIC_KEY ?? "";
export const pushConfigurado = () => Boolean(chavePublica() && process.env.VAPID_PRIVATE_KEY);

let configurado = false;
function configurar() {
  if (configurado) return;
  webpush.setVapidDetails(
    // A Apple recusa o envio sem um contato válido aqui.
    process.env.VAPID_SUBJECT || "mailto:dieta@example.com",
    chavePublica(),
    process.env.VAPID_PRIVATE_KEY ?? "",
  );
  configurado = true;
}

/**
 * Manda para todos os aparelhos cadastrados. Aparelho que o serviço de push diz
 * não existir mais (o app foi apagado, a permissão foi retirada) sai da lista.
 */
export async function enviarParaTodos(e: Envio): Promise<{ enviados: number; falhas: string[] }> {
  if (!pushConfigurado()) return { enviados: 0, falhas: ["Chaves VAPID não configuradas."] };
  configurar();

  const aparelhos = await bd.aparelho.findMany();
  const carga = JSON.stringify({ titulo: e.titulo, corpo: e.corpo, url: e.url, tag: e.tag ?? e.url });
  let enviados = 0;
  const falhas: string[] = [];

  await Promise.all(
    aparelhos.map(async (a) => {
      try {
        await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, carga, {
          TTL: 60 * 60, // Passou uma hora sem entregar, o aviso do almoço já não serve.
          urgency: "high",
        });
        enviados++;
      } catch (erro) {
        if (erro instanceof WebPushError && (erro.statusCode === 404 || erro.statusCode === 410)) {
          await bd.aparelho.delete({ where: { endpoint: a.endpoint } }).catch(() => undefined);
          falhas.push(`${a.nome || "aparelho"}: não existe mais, retirado da lista`);
        } else {
          console.error("[push]", erro);
          falhas.push(`${a.nome || "aparelho"}: ${erro instanceof Error ? erro.message : String(erro)}`);
        }
      }
    }),
  );
  return { enviados, falhas };
}
