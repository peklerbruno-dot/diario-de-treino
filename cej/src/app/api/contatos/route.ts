import { pessoaAtual } from "@/lib/auth";
import { buscarContatos } from "@/lib/consultas-contatos";
import { NOME_DO_ESTADO_DO_CONTATO, NOME_DO_VINCULO, type EstadoDoContato, type VinculoDoContato } from "@/lib/contatos";

export const dynamic = "force-dynamic";

/**
 * A lista segmentada, em planilha.
 *
 * É o que faz o CRM valer desde o primeiro dia, mesmo sem serviço de e-mail
 * configurado: você recorta o segmento aqui e leva a lista para onde precisar.
 * Sem esta saída, uma base sem envio ligado seria uma base trancada.
 */
export async function GET(pedido: Request) {
  if (!(await pessoaAtual())) return new Response("Entre no sistema primeiro.", { status: 401 });

  const p = new URL(pedido.url).searchParams;
  const contatos = await buscarContatos(
    {
      busca: p.get("busca") ?? undefined,
      vinculo: p.get("vinculo") ?? undefined,
      etiquetaId: p.get("etiquetaId") ?? undefined,
      estado: p.get("estado") ?? undefined,
    },
    5000,
  );

  const celula = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const cabecalho = [
    "Nome", "E-mail", "Telefone", "Vínculo", "Instituição", "Etiquetas",
    "Situação", "Pode receber boletim", "De onde veio", "Observação",
  ];

  const linhas = contatos.map((c) =>
    [
      c.nome,
      c.email,
      c.telefone,
      NOME_DO_VINCULO[c.vinculo as VinculoDoContato],
      c.instituicao,
      c.etiquetas.map((e) => e.etiqueta.nome).join(", "),
      NOME_DO_ESTADO_DO_CONTATO[c.estado as EstadoDoContato],
      c.estado === "ATIVO" && c.consentimentoEm ? "sim" : "não",
      c.origem,
      c.observacao,
    ]
      .map(celula)
      .join(";"),
  );

  // `;` e o BOM na frente: é assim que o Excel em português abre o arquivo com
  // as colunas separadas e os acentos no lugar.
  const csv = "﻿" + [cabecalho.map(celula).join(";"), ...linhas].join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contatos-cej.csv"`,
    },
  });
}
