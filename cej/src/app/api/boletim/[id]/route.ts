import { pessoaAtual } from "@/lib/auth";
import { bd } from "@/lib/bd";
import { montarBoletim } from "@/lib/boletim";
import { enderecoDoSistema } from "@/lib/endereco";

export const dynamic = "force-dynamic";

/**
 * O boletim como página solta, para ser selecionado e copiado.
 *
 * Existe porque colar um e-mail formatado no Gmail só funciona de um jeito:
 * abrir a mensagem montada numa aba, selecionar tudo e copiar. O que se copia é
 * o **desenho** — títulos, negritos, a lista de atividades —, e é isso que o
 * Gmail cola de volta. Copiar o código HTML do arquivo não faria nada: o Gmail
 * colaria as letras `<table>` dentro da mensagem.
 *
 * Sai na versão de mandar pela mão, com o pedido de saída por escrito em vez do
 * link pessoal de descadastro, que num Cco não pode existir.
 */
export async function GET(_pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  const pessoa = await pessoaAtual();
  if (!pessoa) return new Response("Entre no sistema primeiro.", { status: 401 });

  const { id } = await params;
  const boletim = await bd.boletim.findUnique({
    where: { id },
    include: { atividades: { include: { atividade: true }, orderBy: { ordem: "asc" } } },
  });
  if (!boletim) return new Response("Não encontrado", { status: 404 });

  const endereco = await enderecoDoSistema();
  const { html } = montarBoletim({
    assunto: boletim.assunto,
    corpo: boletim.corpo,
    atividades: boletim.atividades.map(({ atividade: a }) => ({
      titulo: a.titulo, tipo: a.tipo, dia: a.dia, diaFinal: a.diaFinal, hora: a.hora,
      local: a.local, resumo: a.resumo,
      linkDeInscricao:
        a.inscricaoAberta && a.chavePublica
          ? `${endereco}/inscricao/${a.chavePublica}`
          : a.linkDeInscricao,
    })),
    destinatario: { nome: pessoa.nome, email: pessoa.email, chave: "copia" },
    endereco,
    pelaMao: true,
  });

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
