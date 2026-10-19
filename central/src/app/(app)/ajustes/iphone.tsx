"use client";

import { useState, useTransition } from "react";
import { gerarChaveDoIphone } from "../acoes";

function Copiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [feito, setFeito] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setFeito(true);
          setTimeout(() => setFeito(false), 2500);
        } catch {
          prompt("Copie daqui:", texto);
        }
      }}
      className="rounded-md border border-linha px-3 py-1.5 text-sm font-medium hover:bg-realce"
    >
      {feito ? "Copiado ✓" : rotulo}
    </button>
  );
}

const passo = "pl-1 text-[15px] leading-relaxed text-grafite";

/**
 * O widget (Scriptable) e o atalho "Anotar" (app Atalhos), com o passo a
 * passo. Tudo grátis: nenhum dos dois precisa de app na App Store da Central.
 */
export function NoIphone({ endereco, chave, script }: { endereco: string; chave: string; script: string }) {
  const [pendente, comecar] = useTransition();
  if (!chave) {
    return (
      <div>
        <p className="mb-3 text-[15px] text-grafite">
          Um widget com a agenda e as pendências na tela de início, e um botão (ou “E aí Siri, anotar na Central”) para anotar sem abrir o app.
        </p>
        <button
          disabled={pendente}
          onClick={() => comecar(() => gerarChaveDoIphone())}
          className="rounded-md bg-tinta px-4 py-2 text-sm font-medium text-fundo disabled:opacity-40"
        >
          Ligar widget e atalho
        </button>
      </div>
    );
  }
  const urlAnotar = `${endereco}/api/iphone/anotar?chave=${encodeURIComponent(chave)}`;
  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-2 text-[15px] font-medium">Widget</h3>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li className={passo}>
            Instale o{" "}
            <a href="https://apps.apple.com/app/scriptable/id1405459188" target="_blank" rel="noreferrer" className="underline">
              Scriptable
            </a>{" "}
            (grátis).
          </li>
          <li className={passo}>
            Copie o script: <Copiar texto={script} rotulo="Copiar script do widget" />
          </li>
          <li className={passo}>No Scriptable, toque em <b>+</b>, cole, e no topo troque o nome para <b>Central</b>. Toque em <b>OK</b>.</li>
          <li className={passo}>
            Na tela de início, segure num espaço vazio → <b>Editar</b> → <b>Adicionar widget</b> → <b>Scriptable</b> → escolha o tamanho (o grande mostra
            mais) → <b>Adicionar widget</b>.
          </li>
          <li className={passo}>
            Toque no widget recém-posto (ainda no modo de edição) → em <b>Script</b>, escolha <b>Central</b>. Pronto: tocar nele abre a Central.
          </li>
        </ol>
      </div>

      <div>
        <h3 className="mb-2 text-[15px] font-medium">Atalho “Anotar na Central”</h3>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li className={passo}>
            Copie o endereço: <Copiar texto={urlAnotar} rotulo="Copiar endereço do atalho" />
          </li>
          <li className={passo}>Abra o app <b>Atalhos</b> → <b>+</b> → no topo, dê o nome <b>Anotar na Central</b>.</li>
          <li className={passo}>
            Adicione a ação <b>Pedir Entrada</b> (Texto). Em “Pergunta”, escreva <i>Anotar o quê?</i>
          </li>
          <li className={passo}>
            Adicione <b>Obter Conteúdo do URL</b>. Em URL, cole o endereço. Toque na setinha: <b>Método</b> POST, <b>Corpo da Solicitação</b> JSON →
            Adicionar campo → Texto: chave <b>texto</b>, valor <b>Entrada Fornecida</b>.
          </li>
          <li className={passo}>
            Adicione <b>Obter Valor do Dicionário</b> com a chave <b>mensagem</b>, e depois <b>Mostrar Notificação</b> com esse valor.
          </li>
          <li className={passo}>
            Toque em <b>OK</b>. Para ter à mão: segure o atalho → <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>; ou use o widget do app
            Atalhos na tela bloqueada; ou diga <i>“E aí Siri, anotar na Central”</i>.
          </li>
        </ol>
        <p className="mt-2 text-[14px] text-fosco">Escreva como no WhatsApp: “mandar orçamento pro CEJ até quinta” vira a tarefa com prazo na quinta.</p>
      </div>

      <div className="text-[14px] text-fosco">
        O widget e o atalho entram com uma chave só deles. Se o celular for perdido, troque a chave (os dois param até você copiar de novo).{" "}
        <button
          disabled={pendente}
          onClick={() => confirm("Trocar a chave? O widget e o atalho atuais param de funcionar até você copiar de novo.") && comecar(() => gerarChaveDoIphone())}
          className="underline hover:text-tinta disabled:opacity-40"
        >
          Trocar chave
        </button>
      </div>
    </div>
  );
}
