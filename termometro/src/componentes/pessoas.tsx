"use client";

import { useEffect, useState } from "react";
import {
  acaoConvidar,
  acaoListarPessoas,
  acaoNovoConvite,
  acaoRemoverPessoa,
  acaoTrocarMeuCodigo,
} from "@/app/acoes";
import type { Pessoa } from "@/lib/pessoas";
import { CodigoGuardavel } from "./codigo-guardavel";
import { Botao, Campo, CampoDeTexto, Cartao, Subtitulo } from "./pecas";

/**
 * Quem mais usa o app — só o dono vê.
 *
 * Cada pessoa tem a própria conta, que começa vazia; ninguém vê a de ninguém,
 * nem o dono a dos amigos. Daqui ele convida (o link vai pelo WhatsApp), manda
 * um convite novo para quem perdeu o código e remove quem não usa mais.
 */
export function PessoasDoApp() {
  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [esperando, setEsperando] = useState(false);
  // O convite recém-criado fica aberto embaixo do nome de quem o recebe.
  const [aberto, setAberto] = useState<string | null>(null);

  const recarregar = async () => {
    try {
      setPessoas(await acaoListarPessoas());
    } catch {
      setErro("Não consegui buscar a lista agora. Confira a internet.");
    }
  };

  useEffect(() => {
    void recarregar();
  }, []);

  return (
    <section className="mt-6">
      <Subtitulo>Pessoas</Subtitulo>
      <p className="mt-1 text-[15px] leading-relaxed text-grafite">
        Convide alguém para usar o app com as próprias contas. A conta da pessoa começa do zero, e
        ninguém vê a de ninguém — nem você a dela.
      </p>

      <form
        className="mt-2 flex items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!nome.trim()) return;
          setEsperando(true);
          setErro(null);
          try {
            const r = await acaoConvidar(nome);
            if ("erro" in r) setErro(r.erro);
            else {
              setNome("");
              await recarregar();
              setAberto(r.token);
            }
          } catch {
            setErro("Não consegui criar o convite. Confira a internet.");
          } finally {
            setEsperando(false);
          }
        }}
      >
        <div className="flex-1">
          <Campo rotulo="Nome de quem você vai convidar">
            <CampoDeTexto valor={nome} aoMudar={setNome} maxLength={40} placeholder="Ana" />
          </Campo>
        </div>
        <Botao submit disabled={esperando || !nome.trim()}>
          {esperando ? "Criando…" : "Convidar"}
        </Botao>
      </form>

      {erro && (
        <p role="alert" className="mt-2 text-[14px] text-atencao">
          {erro}
        </p>
      )}

      {pessoas && pessoas.length > 0 && (
        <Cartao className="mt-3 px-4 py-1">
          {pessoas.map((p) => (
            <UmaPessoa
              key={p.id}
              pessoa={p}
              aberto={aberto}
              aoAbrir={setAberto}
              aoMudar={recarregar}
            />
          ))}
        </Cartao>
      )}
    </section>
  );
}

function UmaPessoa({
  pessoa,
  aberto,
  aoAbrir,
  aoMudar,
}: {
  pessoa: Pessoa;
  aberto: string | null;
  aoAbrir: (token: string | null) => void;
  aoMudar: () => Promise<void>;
}) {
  const [removendo, setRemovendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const convite = pessoa.conviteValendo;
  const mostrandoConvite = convite !== null && aberto === convite.token;

  const situacao = convite
    ? `${pessoa.ativa ? "Usando · " : ""}convite valendo até ${new Date(convite.expiraEm).toLocaleDateString("pt-BR")}`
    : pessoa.ativa
      ? "Usando"
      : "Convite vencido";

  return (
    <div className="border-b border-linha py-3 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[16px] font-medium">{pessoa.nome}</span>
        <span className="shrink-0 text-[13px] text-fosco">{situacao}</span>
      </div>

      {mostrandoConvite && convite && <LinkDoConvite nome={pessoa.nome} token={convite.token} />}

      {erro && (
        <p role="alert" className="mt-2 text-[14px] text-atencao">
          {erro}
        </p>
      )}

      {removendo ? (
        <div className="mt-2">
          <p className="text-[14px] leading-relaxed text-atencao">
            Remover {pessoa.nome} apaga a conta e tudo o que foi lançado nela. Não tem volta.
          </p>
          <div className="mt-2 flex gap-2">
            <Botao
              tipo="perigo"
              onClick={async () => {
                const r = await acaoRemoverPessoa(pessoa.id).catch(() => ({
                  erro: "Não consegui remover. Confira a internet.",
                }));
                if ("erro" in r) setErro(r.erro);
                else await aoMudar();
              }}
            >
              Sim, remover
            </Botao>
            <Botao onClick={() => setRemovendo(false)}>Cancelar</Botao>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {convite && !mostrandoConvite ? (
            <Botao onClick={() => aoAbrir(convite.token)} className="!min-h-[40px] !text-[14.5px]">
              Ver o convite
            </Botao>
          ) : (
            !convite && (
              <Botao
                onClick={async () => {
                  setErro(null);
                  const r = await acaoNovoConvite(pessoa.id).catch(() => ({
                    erro: "Não consegui criar o convite. Confira a internet.",
                  }));
                  if ("erro" in r) setErro(r.erro);
                  else {
                    await aoMudar();
                    aoAbrir(r.token);
                  }
                }}
                className="!min-h-[40px] !text-[14.5px]"
              >
                {pessoa.ativa ? "Perdeu o código? Novo convite" : "Novo convite"}
              </Botao>
            )
          )}
          <Botao
            tipo="perigo"
            onClick={() => setRemovendo(true)}
            className="!min-h-[40px] !text-[14.5px]"
          >
            Remover
          </Botao>
        </div>
      )}
    </div>
  );
}

function LinkDoConvite({ nome, token }: { nome: string; token: string }) {
  const [copiou, setCopiou] = useState(false);
  const endereco = `${window.location.origin}/convite/${token}`;
  const recado = `Oi, ${nome}! Te convidei para o Finanças do BP, o app que eu uso para as minhas contas. Abra este link no iPhone (no Safari) e toque em "Criar meu acesso": ${endereco}`;
  const podeCompartilhar = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div className="mt-2 rounded-folha bg-papel p-3">
      <p className="text-[13px] text-grafite">
        Mande este link para {nome}. Vale por sete dias e funciona uma vez só.
      </p>
      <p data-convite className="mt-1 select-all break-all text-[14px]">
        {endereco}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {podeCompartilhar && (
          <Botao
            tipo="primario"
            onClick={() => void navigator.share({ text: recado }).catch(() => {})}
            className="!min-h-[40px] !text-[14.5px]"
          >
            Mandar
          </Botao>
        )}
        <Botao
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(recado);
              setCopiou(true);
            } catch {
              setCopiou(false);
            }
          }}
          className="!min-h-[40px] !text-[14.5px]"
        >
          {copiou ? "Copiado" : "Copiar"}
        </Botao>
      </div>
    </div>
  );
}

/**
 * O acesso de quem foi convidado: trocar o próprio código.
 *
 * É a saída para "perdi meu código" enquanto o aparelho ainda está dentro, e
 * para "alguém viu meu código". O código antigo deixa de valer na hora; os
 * aparelhos que já estão dentro continuam dentro.
 */
export function MeuAcesso() {
  const [confirmando, setConfirmando] = useState(false);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  return (
    <section className="mt-6">
      <Subtitulo>Meu código de acesso</Subtitulo>
      <p className="mt-1 text-[15px] leading-relaxed text-grafite">
        É com ele que você entra em outro aparelho. Se perdeu, gere um novo aqui — o antigo deixa de
        valer na hora, e se você montou o atalho da Siri, troque o código nele também.
      </p>
      {codigo ? (
        <div className="mt-3">
          <CodigoGuardavel codigo={codigo} />
        </div>
      ) : confirmando ? (
        <div className="mt-2 flex gap-2">
          <Botao
            tipo="primario"
            onClick={async () => {
              setErro(null);
              const r = await acaoTrocarMeuCodigo().catch(() => ({
                erro: "Não consegui falar com o servidor. Confira a internet.",
              }));
              if ("erro" in r) setErro(r.erro);
              else setCodigo(r.codigo);
              setConfirmando(false);
            }}
          >
            Sim, gerar outro
          </Botao>
          <Botao onClick={() => setConfirmando(false)}>Cancelar</Botao>
        </div>
      ) : (
        <Botao onClick={() => setConfirmando(true)} className="mt-2">
          Gerar um novo código
        </Botao>
      )}
      {erro && (
        <p role="alert" className="mt-2 text-[14px] text-atencao">
          {erro}
        </p>
      )}
    </section>
  );
}
