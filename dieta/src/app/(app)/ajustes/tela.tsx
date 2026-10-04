"use client";

import { useState, useTransition } from "react";
import { acaoDeSair, salvarAjustes } from "@/app/acoes";
import { useAvisos } from "@/componentes/avisos";
import { Lembretes } from "@/componentes/lembretes";
import { Botao, Cartao, Chave, Titulo } from "@/componentes/pecas";
import type { LembreteSeu } from "@/lib/agenda";
import { litros, type Ajustes } from "@/lib/ajustes";

type Props = {
  ajustes: Ajustes;
  lembretes: LembreteSeu[];
  chavePublica: string;
  aparelhos: { nome: string; desde: string }[];
  falta: { push: boolean; cron: boolean; gemini: boolean };
  chavesSugeridas: { publicKey: string; privateKey: string } | null;
};

export function TelaAjustes(p: Props) {
  const [, iniciar] = useTransition();
  const salvar = (parcial: Partial<Ajustes>) => iniciar(() => salvarAjustes(parcial));
  const a = p.ajustes;

  return (
    <>
      <Titulo>Ajustes</Titulo>

      {(p.falta.push || p.falta.cron || p.falta.gemini) && <Pendencias falta={p.falta} chaves={p.chavesSugeridas} />}

      <p className="sobrescrito mb-2 px-1">Avisos</p>
      <AvisosDesteAparelho chavePublica={p.chavePublica} aparelhos={p.aparelhos} />

      <Cartao className="mt-3 divide-y divide-linha !py-1">
        <Linha rotulo="Avisar na hora das refeições">
          <Chave ligado={a.avisarRefeicoes} rotulo="Avisar na hora das refeições" aoMudar={(v) => salvar({ avisarRefeicoes: v })} />
        </Linha>
        <Linha rotulo="Avisar">
          <select
            className="rounded-[10px] bg-papel px-2 py-1.5 text-[16px]"
            value={a.antecedencia}
            onChange={(e) => salvar({ antecedencia: Number(e.target.value) })}
          >
            <option value={0}>na hora</option>
            <option value={5}>5 min antes</option>
            <option value={10}>10 min antes</option>
            <option value={15}>15 min antes</option>
            <option value={30}>30 min antes</option>
          </select>
        </Linha>
      </Cartao>
      <p className="mt-1.5 px-1 text-[13px] leading-snug text-fosco">
        Dá para desligar o aviso de uma refeição só na tela Plano. Refeição já marcada não avisa.
      </p>

      <p className="sobrescrito mb-2 mt-6 px-1">Lembretes</p>
      <Lembretes lista={p.lembretes} />

      <p className="sobrescrito mb-2 mt-6 px-1">Resumo do dia</p>
      <Cartao className="divide-y divide-linha !py-1">
        <Linha rotulo="Resumo à noite">
          <Chave ligado={a.resumoNoturno} rotulo="Resumo à noite" aoMudar={(v) => salvar({ resumoNoturno: v })} />
        </Linha>
        {a.resumoNoturno && (
          <Linha rotulo="Às">
            <input
              type="time"
              className="w-[104px] rounded-[10px] bg-papel px-2 py-1 text-[16px] tabular"
              defaultValue={a.resumoHora}
              onBlur={(e) => e.target.value && salvar({ resumoHora: e.target.value })}
            />
          </Linha>
        )}
      </Cartao>
      <p className="mt-1.5 px-1 text-[13px] leading-snug text-fosco">
        Uma notificação com quantas refeições seguiram o plano e quanto de água você bebeu.
      </p>

      <p className="sobrescrito mb-2 mt-6 px-1">Água</p>
      <Cartao className="divide-y divide-linha !py-1">
        <Linha rotulo="Meta do dia">
          <Numero valor={a.aguaMeta} passo={250} min={500} max={6000} formato={litros} aoMudar={(v) => salvar({ aguaMeta: v })} />
        </Linha>
        <Linha rotulo="Tamanho do copo">
          <Numero valor={a.copo} passo={50} min={100} max={1000} formato={litros} aoMudar={(v) => salvar({ copo: v })} />
        </Linha>
        <Linha rotulo="Lembrar de beber água">
          <Chave ligado={a.avisarAgua} rotulo="Lembrar de beber água" aoMudar={(v) => salvar({ avisarAgua: v })} />
        </Linha>
        {a.avisarAgua && (
          <>
            <Linha rotulo="A cada">
              <select
                className="rounded-[10px] bg-papel px-2 py-1.5 text-[16px]"
                value={a.aguaIntervalo}
                onChange={(e) => salvar({ aguaIntervalo: Number(e.target.value) })}
              >
                {[45, 60, 90, 120, 180].map((m) => (
                  <option key={m} value={m}>
                    {m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60} h`}
                  </option>
                ))}
              </select>
            </Linha>
            <Linha rotulo="Das">
              <span className="flex items-center gap-2">
                <input
                  type="time"
                  className="w-[104px] rounded-[10px] bg-papel px-2 py-1 text-[16px] tabular"
                  defaultValue={a.aguaInicio}
                  onBlur={(e) => e.target.value && salvar({ aguaInicio: e.target.value })}
                />
                às
                <input
                  type="time"
                  className="w-[104px] rounded-[10px] bg-papel px-2 py-1 text-[16px] tabular"
                  defaultValue={a.aguaFim}
                  onBlur={(e) => e.target.value && salvar({ aguaFim: e.target.value })}
                />
              </span>
            </Linha>
          </>
        )}
      </Cartao>
      <p className="mt-1.5 px-1 text-[13px] leading-snug text-fosco">
        Os lembretes param quando a meta do dia é batida, e pulam o horário que cairia colado numa refeição.
      </p>

      <form action={acaoDeSair} className="mt-8">
        <Botao type="submit" tipo="fantasma" className="w-full">
          Sair deste aparelho
        </Botao>
      </form>
    </>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 py-2">
      <span className="text-[16px]">{rotulo}</span>
      {children}
    </div>
  );
}

function Numero(p: { valor: number; passo: number; min: number; max: number; formato: (n: number) => string; aoMudar: (n: number) => void }) {
  const [v, setV] = useState(p.valor);
  const mudar = (n: number) => {
    const novo = Math.min(p.max, Math.max(p.min, n));
    setV(novo);
    p.aoMudar(novo);
  };
  return (
    <span className="flex items-center gap-1">
      <button type="button" aria-label="Menos" className="h-9 w-9 rounded-full bg-papel text-[20px]" onClick={() => mudar(v - p.passo)}>
        −
      </button>
      <span className="w-[72px] text-center tabular">{p.formato(v)}</span>
      <button type="button" aria-label="Mais" className="h-9 w-9 rounded-full bg-papel text-[20px]" onClick={() => mudar(v + p.passo)}>
        +
      </button>
    </span>
  );
}

function AvisosDesteAparelho({ chavePublica, aparelhos }: { chavePublica: string; aparelhos: { nome: string; desde: string }[] }) {
  const { estado, erro, ativar, desativar } = useAvisos(chavePublica);
  const [teste, setTeste] = useState("");

  const testar = async () => {
    setTeste("Mandando…");
    const r = await fetch("/api/teste", { method: "POST" }).then((x) => x.json()).catch(() => null);
    if (!r) return setTeste("Não consegui falar com o servidor.");
    setTeste(r.enviados ? `Enviado para ${r.enviados} aparelho(s). Deve chegar em segundos.` : `Não saiu: ${r.falhas?.join("; ") || "nenhum aparelho cadastrado."}`);
  };

  const situacao: Record<typeof estado, string> = {
    carregando: "…",
    "sem-suporte": "Este navegador não recebe notificações.",
    instalar: "Para receber avisos no iPhone, instale o app: Compartilhar → Adicionar à Tela de Início, e abra pelo ícone.",
    negado: "Notificações recusadas. Para ligar: Ajustes do iPhone → Notificações → Dieta.",
    desligado: "Os avisos estão desligados neste aparelho.",
    ligado: "Este aparelho recebe os avisos. ✅",
  };

  return (
    <Cartao>
      <p className="text-[15.5px] leading-snug">{situacao[estado]}</p>
      {erro && <p className="mt-2 text-[14px] text-pulou">{erro}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {estado === "desligado" && (
          <Botao tipo="primario" onClick={ativar}>
            Ativar avisos aqui
          </Botao>
        )}
        {estado === "ligado" && (
          <>
            <Botao tipo="primario" onClick={testar}>
              Mandar um aviso de teste
            </Botao>
            <Botao tipo="fantasma" onClick={desativar}>
              Desligar aqui
            </Botao>
          </>
        )}
      </div>
      {teste && <p className="mt-2 text-[14px] text-grafite">{teste}</p>}
      {aparelhos.length > 0 && (
        <p className="mt-3 text-[13px] text-fosco">
          Recebem avisos: {aparelhos.map((a) => a.nome).join(", ")}.
        </p>
      )}
    </Cartao>
  );
}

function Pendencias({ falta, chaves }: { falta: Props["falta"]; chaves: Props["chavesSugeridas"] }) {
  return (
    <Cartao className="mb-6 !bg-troca-clara">
      <p className="font-semibold">Falta configurar na Vercel</p>
      <p className="mt-1 text-[14.5px] leading-snug text-grafite">
        Em Settings → Environment Variables do projeto, cadastre o que está abaixo e publique de novo (Deployments → ⋯ →
        Redeploy). O passo a passo está em <code>dieta/docs/COLOCAR-NO-AR.md</code>.
      </p>
      <ul className="mt-3 space-y-3 text-[14.5px]">
        {falta.push && chaves && (
          <li>
            <strong>Notificações</strong> — um par de chaves já gerado para você, só copiar:
            <Copiavel nome="VAPID_PUBLIC_KEY" valor={chaves.publicKey} />
            <Copiavel nome="VAPID_PRIVATE_KEY" valor={chaves.privateKey} />
            <span className="mt-1 block text-[13px] text-grafite">
              E <code>VAPID_SUBJECT</code> = <code>mailto:</code> seguido do seu e-mail. Cadastre o par de uma vez e não troque
              mais: trocar desliga os avisos de todo aparelho.
            </span>
          </li>
        )}
        {falta.cron && (
          <li>
            <strong>O relógio dos avisos</strong> — <code>CRON_SECRET</code>, um texto aleatório. Depois, o cron-job.org
            chama o app a cada minuto (passo 5 do guia).
          </li>
        )}
        {falta.gemini && (
          <li>
            <strong>Leitura do PDF</strong> — <code>GEMINI_API_KEY</code>, grátis em aistudio.google.com.
          </li>
        )}
      </ul>
    </Cartao>
  );
}

function Copiavel({ nome, valor }: { nome: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <span className="mt-1.5 flex items-center gap-2">
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] text-fosco">{nome}</span>
        <code className="block truncate rounded-[8px] bg-cartao px-2 py-1 text-[12.5px]">{valor}</code>
      </span>
      <Botao
        className="!px-3 !py-1.5 text-[14px]"
        onClick={() => navigator.clipboard.writeText(valor).then(() => setCopiado(true))}
      >
        {copiado ? "Copiado" : "Copiar"}
      </Botao>
    </span>
  );
}
