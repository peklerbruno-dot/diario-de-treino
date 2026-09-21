import { bd } from "@/lib/bd";
import { montarIcs } from "@/lib/agenda";
import { eventosDaAgenda } from "@/lib/consultas";

export const dynamic = "force-dynamic";

/**
 * O calendário que o Google busca.
 *
 * Sem cookie e sem sessão: quem faz o pedido é um servidor do Google, do outro
 * lado do mundo, que não tem como ter feito login. O que protege é a chave no
 * endereço — 32 bytes de acaso, uma por pessoa, trocável na tela Equipe.
 *
 * É por isso que o `middleware.ts` deixa `/api/agenda` passar: um desvio para a
 * tela de entrada faria a agenda de todo mundo ficar silenciosamente vazia.
 */
export async function GET(_pedido: Request, { params }: { params: Promise<{ chave: string }> }) {
  const { chave } = await params;

  const pessoa = await bd.pessoa.findFirst({
    where: { chaveDaAgenda: chave, ativa: true },
    select: { id: true },
  });

  // 404, e não 403: para quem tem a chave errada, é como se o endereço não
  // existisse — não há o que confirmar a quem estiver tentando adivinhar.
  if (!pessoa) return new Response("Não encontrado", { status: 404 });

  const eventos = await eventosDaAgenda();
  const ics = montarIcs(eventos, { nome: "Centro de Estudos Judaicos — USP" });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="cej.ics"',
      // Nada de cache: o Google já decide sozinho de quanto em quanto tempo
      // busca, e um cache intermediário só atrasaria a remarcação de uma
      // reunião sem que ninguém entendesse por quê.
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
