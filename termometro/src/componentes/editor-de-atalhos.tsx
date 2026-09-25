"use client";

import { useState } from "react";
import { idParaAtalho, type AtalhoFixo } from "@/lib/atalhos";
import { categoriasDoTipo, nomeDaCategoria, type Categoria } from "@/lib/categorias";
import { comCifrao, paraCentavos } from "@/lib/dinheiro";
import { atalhosDe, categoriasDe, guardarAtalhos, type Estado } from "@/lib/loja";
import { NOME_DO_TIPO, TIPOS, type Tipo } from "@/lib/tipos";
import { Botao, Campo, CampoDeTexto, CampoDeValor, Cartao, Subtitulo } from "./pecas";

/**
 * Onde se montam os botões da fileira da tela Hoje.
 *
 * A lista mostra o resumo e esconde o formulário: cinco campos por linha,
 * abertos ao mesmo tempo, viram uma parede. Um atalho por vez em edição é o
 * suficiente — ninguém mexe em dois botões na mesma respirada.
 */
export function EditorDeAtalhos({ estado }: { estado: Estado }) {
  const atalhos = atalhosDe(estado);
  const categorias = categoriasDe(estado);
  /** O id em edição, ou "novo" enquanto se acrescenta. Nulo é a lista fechada. */
  const [aberto, setAberto] = useState<string | null>(null);

  function salvar(dados: AtalhoFixo) {
    const existe = atalhos.some((a) => a.id === dados.id);
    guardarAtalhos(
      existe ? atalhos.map((a) => (a.id === dados.id ? dados : a)) : [...atalhos, dados],
    );
    setAberto(null);
  }

  function apagar(id: string) {
    guardarAtalhos(atalhos.filter((a) => a.id !== id));
    setAberto(null);
  }

  return (
    <section className="mt-6">
      <Subtitulo>Atalhos rápidos</Subtitulo>
      <p className="mt-1 text-[15px] leading-relaxed text-grafite">
        Os botões que aparecem na aba <strong>Hoje</strong>, embaixo dos lançamentos do dia. Cada um
        guarda a coluna, a categoria e a observação de um gasto que se repete — tocar nele abre o
        lançamento já preenchido, faltando só o valor.
      </p>

      {atalhos.length > 0 && (
        <Cartao className="mt-3 px-4 py-1">
          {atalhos.map((a) =>
            aberto === a.id ? (
              <div key={a.id} className="border-b border-linha py-3 last:border-b-0">
                <Formulario
                  atalho={a}
                  categorias={categorias}
                  aoSalvar={salvar}
                  aoCancelar={() => setAberto(null)}
                  aoApagar={() => apagar(a.id)}
                />
              </div>
            ) : (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 border-b border-linha py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium">{a.titulo}</p>
                  <p className="mt-0.5 truncate text-[12.5px] text-fosco">
                    {resumo(a, categorias)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAberto(a.id)}
                  className="shrink-0 text-[13px] text-grafite underline"
                >
                  Editar
                </button>
              </div>
            ),
          )}
        </Cartao>
      )}

      {aberto === "novo" ? (
        <Cartao className="mt-3 px-4 py-3">
          <Formulario
            categorias={categorias}
            aoSalvar={(dados) => salvar({ ...dados, id: idParaAtalho(atalhos, dados.titulo) })}
            aoCancelar={() => setAberto(null)}
          />
        </Cartao>
      ) : (
        <Botao onClick={() => setAberto("novo")} className="mt-3">
          Novo atalho
        </Botao>
      )}

      <p className="mt-2 text-[12.5px] leading-snug text-fosco">
        Apagar um atalho não mexe no que já foi lançado por ele: some o botão, ficam os lançamentos.
      </p>
    </section>
  );
}

/** A linha cinza embaixo do nome: o que este botão vai preencher. */
function resumo(a: AtalhoFixo, categorias: Categoria[]): string {
  const partes = [NOME_DO_TIPO[a.tipo]];
  if (a.categoriaId) partes.push(nomeDaCategoria(categorias, a.categoriaId));
  if (a.observacaoPadrao.trim()) partes.push(`“${a.observacaoPadrao.trim()}”`);
  if (a.valorPadraoCents !== null && a.valorPadraoCents > 0) {
    partes.push(comCifrao(a.valorPadraoCents));
  }
  return partes.join(" · ");
}

const VAZIO = { titulo: "", categoriaId: null, observacaoPadrao: "", valorPadraoCents: null };

function Formulario({
  atalho,
  categorias,
  aoSalvar,
  aoCancelar,
  aoApagar,
}: {
  atalho?: AtalhoFixo;
  categorias: Categoria[];
  aoSalvar: (dados: AtalhoFixo) => void;
  aoCancelar: () => void;
  aoApagar?: () => void;
}) {
  const inicial = atalho ?? { ...VAZIO, id: "", tipo: "DIARIO" as Tipo };

  const [titulo, setTitulo] = useState(inicial.titulo);
  const [tipo, setTipo] = useState<Tipo>(inicial.tipo);
  const [categoriaId, setCategoriaId] = useState<string | null>(inicial.categoriaId);
  const [observacao, setObservacao] = useState(inicial.observacaoPadrao);
  const [valor, setValor] = useState(
    inicial.valorPadraoCents !== null
      ? (inicial.valorPadraoCents / 100).toFixed(2).replace(".", ",")
      : "",
  );
  const [erro, setErro] = useState<string | null>(null);

  // Trocar de coluna troca a lista de categorias, e a escolhida pode não estar
  // na nova — mesma regra da folha de lançamento: o que fica na tela é o que
  // vai ser salvo.
  const daColuna = categoriasDoTipo(categorias, tipo);
  const escolhida = daColuna.some((c) => c.id === categoriaId) ? categoriaId : null;

  function enviar() {
    const nome = titulo.trim();
    if (!nome) {
      setErro("O botão precisa de um nome.");
      return;
    }
    // Um campo de valor em branco é "sem sugestão"; um campo preenchido com
    // besteira é um engano, e engano não vira silenciosamente nulo.
    const cents = valor.trim() ? paraCentavos(valor) : null;
    if (valor.trim() && cents === null) {
      setErro("Não entendi o valor sugerido.");
      return;
    }
    aoSalvar({
      id: atalho?.id ?? "",
      titulo: nome,
      tipo,
      categoriaId: escolhida,
      observacaoPadrao: observacao.trim(),
      valorPadraoCents: cents,
    });
  }

  return (
    <div className="space-y-3">
      <Campo rotulo="Nome do botão">
        <CampoDeTexto valor={titulo} aoMudar={setTitulo} placeholder="Almoço FFLCH" />
      </Campo>

      <div>
        <span className="block text-[14px] text-grafite">Coluna</span>
        <div className="mt-1.5 flex gap-1.5">
          {TIPOS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tipo === t}
              onClick={() => setTipo(t)}
              className={`min-h-[38px] flex-1 rounded-full text-[13.5px] ${
                tipo === t ? "bg-saldo font-medium text-white" : "bg-papel text-grafite"
              }`}
            >
              {NOME_DO_TIPO[t]}
            </button>
          ))}
        </div>
      </div>

      {daColuna.length > 0 && (
        <div>
          <span className="block text-[14px] text-grafite">Categoria</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {daColuna.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={escolhida === c.id}
                onClick={() => setCategoriaId(escolhida === c.id ? null : c.id)}
                className={`min-h-[34px] rounded-full px-3.5 text-[13.5px] ${
                  escolhida === c.id ? "bg-saldo font-medium text-white" : "bg-papel text-grafite"
                }`}
              >
                {c.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      <Campo rotulo="Observação" dica="É o que vai escrito na linha do lançamento.">
        <CampoDeTexto valor={observacao} aoMudar={setObservacao} placeholder="Bandejão" />
      </Campo>

      <Campo
        rotulo="Valor sugerido (opcional)"
        dica="Deixe em branco quando o valor muda todo dia — aí o teclado abre vazio."
      >
        <CampoDeValor valor={valor} aoMudar={setValor} />
      </Campo>

      {erro && (
        <p role="alert" className="text-[14px] text-atencao">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-0.5">
        <Botao tipo="primario" onClick={enviar}>
          Salvar atalho
        </Botao>
        <Botao onClick={aoCancelar}>Cancelar</Botao>
        {aoApagar && (
          <Botao tipo="perigo" onClick={aoApagar}>
            Apagar
          </Botao>
        )}
      </div>
    </div>
  );
}
