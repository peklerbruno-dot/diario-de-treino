/**
 * Envio do link mágico.
 *
 * Em desenvolvimento o link vai para o terminal (e a tela mostra o link), para
 * não depender de provedor nenhum. Em produção, ligue aqui o serviço de e-mail
 * do movimento — é o único lugar que precisa mudar.
 */
export async function enviarLinkDeEntrada(email: string, url: string): Promise<void> {
  if (process.env.NODE_ENV === "production" && process.env.EMAIL_WEBHOOK) {
    await fetch(process.env.EMAIL_WEBHOOK, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        para: email,
        assunto: "Seu link de entrada — Precificação de machanot",
        texto: `Para entrar na plataforma, abra este link (vale por 15 minutos):\n\n${url}\n`,
      }),
    });
    return;
  }
  console.log(`\n[link de entrada] ${email}\n${url}\n`);
}

/** Em dev devolvemos o link para a tela; em produção, nunca. */
export const mostraLinkNaTela = process.env.NODE_ENV !== "production";
