"use client";

import { useMachane } from "@/components/machane/provedor";
import { Cartao, CartaoCorpo, CartaoDescricao, CartaoTitulo, CartaoTopo } from "@/components/ui/card";
import { Campo, Selecao } from "@/components/ui/input";
import { Botao } from "@/components/ui/button";
import { Tabela, Td, Th } from "@/components/ui/table";
import { Selo } from "@/components/ui/badge";
import { Aviso } from "@/components/ui/avisos";
import { CampoDinheiro, CampoInteiro } from "@/components/campos";
import { brl } from "@/lib/dinheiro";
import { PAPEIS, PAPEL_EXPLICACAO, TURMAS } from "@/lib/textos";
import type { Papel, Turma } from "@/lib/calculo";

export function TelaPessoas() {
  const {
    estado,
    resultado,
    editarCategoria,
    adicionarCategoria,
    removerCategoria,
    somenteLeitura,
  } = useMachane();

  const pessoaDia = (q: number, d: number) => q * d;

  return (
    <div className="space-y-4">
      <Cartao>
        <CartaoTopo className="flex items-start justify-between gap-3">
          <div>
            <CartaoTitulo>Quem vai à machané</CartaoTitulo>
            <CartaoDescricao>
              Uma linha por categoria: quantos são e quanto cada um paga. O papel decide o que o
              sistema faz com a linha — chanichim recebem o rateio, madrichim e peilim são
              subsidiados, equipe e prestadores não pagam. Não há cadastro de nomes em lugar nenhum
              desta plataforma.
            </CartaoDescricao>
          </div>
          <Botao onClick={() => void adicionarCategoria()} disabled={somenteLeitura}>
            Nova categoria
          </Botao>
        </CartaoTopo>

        <CartaoCorpo className="p-0">
          <Tabela>
            <thead>
              <tr>
                <Th className="min-w-[170px]">Categoria</Th>
                <Th className="min-w-[120px]">Papel</Th>
                <Th className="min-w-[110px]">Turma</Th>
                <Th className="w-20 text-right">Dias</Th>
                <Th className="w-24 text-right">Qtd.</Th>
                <Th className="w-28 text-right">Pessoa-dia</Th>
                <Th className="w-32 text-right">Cada um paga</Th>
                <Th className="w-28 text-center">Hospedagem</Th>
                <Th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {estado.categorias.map((c) => (
                <tr key={c.id} className="hover:bg-fundo/60">
                  <Td>
                    <Campo
                      aria-label="Nome da categoria"
                      value={c.nome}
                      disabled={somenteLeitura}
                      onChange={(e) => editarCategoria(c.id, { nome: e.target.value })}
                    />
                  </Td>
                  <Td>
                    <Selecao
                      aria-label="Papel"
                      value={c.papel}
                      disabled={somenteLeitura}
                      title={PAPEL_EXPLICACAO[c.papel]}
                      onChange={(e) => editarCategoria(c.id, { papel: e.target.value as Papel })}
                    >
                      {Object.entries(PAPEIS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Selecao>
                  </Td>
                  <Td>
                    <Selecao
                      aria-label="Turma"
                      value={c.turma}
                      disabled={somenteLeitura}
                      onChange={(e) => editarCategoria(c.id, { turma: e.target.value as Turma })}
                    >
                      {Object.entries(TURMAS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Selecao>
                  </Td>
                  <Td>
                    <CampoInteiro
                      valor={c.dias}
                      max={60}
                      disabled={somenteLeitura}
                      aoMudar={(n) => editarCategoria(c.id, { dias: n })}
                    />
                  </Td>
                  <Td>
                    <CampoInteiro
                      valor={c.quantidade}
                      disabled={somenteLeitura}
                      aoMudar={(n) => editarCategoria(c.id, { quantidade: n })}
                    />
                  </Td>
                  <Td className="tabular text-right text-suave">
                    {pessoaDia(c.quantidade, c.dias)}
                  </Td>
                  <Td>
                    <CampoDinheiro
                      valor={c.contribuicaoCents}
                      disabled={somenteLeitura || c.papel === "CHANICH"}
                      aoMudar={(n) => editarCategoria(c.id, { contribuicaoCents: n })}
                    />
                  </Td>
                  <Td className="text-center">
                    <input
                      type="checkbox"
                      aria-label="Gera hospedagem"
                      className="h-4 w-4 accent-[hsl(var(--acento))]"
                      checked={c.geraHospedagem}
                      disabled={somenteLeitura}
                      onChange={(e) =>
                        editarCategoria(c.id, { geraHospedagem: e.target.checked })
                      }
                    />
                  </Td>
                  <Td className="text-right">
                    <Botao
                      variante="sutil"
                      tamanho="icone"
                      aria-label={`Apagar ${c.nome}`}
                      disabled={somenteLeitura}
                      onClick={() => {
                        if (confirm(`Apagar a categoria "${c.nome}"?`)) void removerCategoria(c.id);
                      }}
                    >
                      ×
                    </Botao>
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-fundo font-medium">
                <Td colSpan={4} className="text-xs uppercase tracking-wide text-suave">
                  Total
                </Td>
                <Td className="tabular text-right">{resultado.totalPessoas}</Td>
                <Td className="tabular text-right">{resultado.pessoaDiaTotal}</Td>
                <Td className="tabular text-right text-suave">
                  {brl(
                    estado.categorias
                      .filter((c) => c.papel !== "CHANICH")
                      .reduce((s, c) => s + c.quantidade * c.contribuicaoCents, 0),
                  )}
                </Td>
                <Td colSpan={2} className="tabular text-right text-suave">
                  {brl(resultado.hospedagemCents)}
                </Td>
              </tr>
            </tfoot>
          </Tabela>
        </CartaoCorpo>
      </Cartao>

      <div className="grid gap-3 sm:grid-cols-2">
        <Cartao>
          <CartaoTopo>
            <CartaoTitulo>A coluna &ldquo;hospedagem&rdquo;</CartaoTitulo>
          </CartaoTopo>
          <CartaoCorpo className="space-y-2 text-xs leading-relaxed text-suave">
            <p>
              Marcada, a plataforma cobra a diária desta categoria no bloco de hospedagem
              (quantidade × dias × diária).
            </p>
            <p>
              Desmarcada, a diária dela precisa estar como gasto fixo do tipo{" "}
              <strong>por diária</strong> na tela de Custos. É assim que a planilha antiga
              registrava enfermeira, psicóloga, mechanech, shagririm e segurança.
            </p>
            <p>
              <strong>Marcar nos dois lugares conta a diária duas vezes.</strong> Quando isso
              acontecer, o painel avisa em amarelo.
            </p>
          </CartaoCorpo>
        </Cartao>

        <Cartao>
          <CartaoTopo>
            <CartaoTitulo>O que cada papel faz no cálculo</CartaoTitulo>
          </CartaoTopo>
          <CartaoCorpo className="space-y-1.5 text-xs leading-relaxed">
            {Object.entries(PAPEIS).map(([k, v]) => (
              <p key={k}>
                <Selo variante={k === "CHANICH" ? "acento" : "neutro"}>{v}</Selo>{" "}
                <span className="text-suave">
                  {PAPEL_EXPLICACAO[k as keyof typeof PAPEL_EXPLICACAO]}
                </span>
              </p>
            ))}
          </CartaoCorpo>
        </Cartao>
      </div>

      {resultado.chanichimGrandes + resultado.chanichimPequenos === 0 ? (
        <Aviso tom="erro">
          Sem chanichim não há entre quem ratear: os preços ficam zerados até alguém preencher as
          quantidades.
        </Aviso>
      ) : null}
    </div>
  );
}
