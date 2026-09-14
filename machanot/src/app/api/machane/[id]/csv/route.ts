import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/lib/auth";
import { carregarMachane } from "@/lib/carregar";
import { calcular } from "@/lib/calculo";
import { paraInput } from "@/lib/estado";
import { csvOrcamento } from "@/lib/divulgacao";

/** Fase 5 — CSV do orçamento, para consolidar no orçamento anual do movimento. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao) return new NextResponse("Sem sessão.", { status: 401 });

  const { id } = await ctx.params;
  const estado = await carregarMachane(id);
  if (!estado) return new NextResponse("Machané não encontrada.", { status: 404 });

  const csv = csvOrcamento(estado, calcular(paraInput(estado)));
  const nome = `orcamento-${estado.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;

  // BOM para o Excel em pt-BR abrir com acentos certos.
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${nome}"`,
      "cache-control": "no-store",
    },
  });
}
