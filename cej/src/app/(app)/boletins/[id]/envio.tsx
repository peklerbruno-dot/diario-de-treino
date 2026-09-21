"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mandarLote } from "../acoes";
import { Aviso } from "@/componentes/pecas";

/**
 * O envio, andando.
 *
 * Um lote de cada vez, um pedido de cada vez, até acabar. Enquanto isso a tela
 * mostra quanto já saiu — porque um envio para mil pessoas leva minutos, e uma
 * tela parada nesse tempo parece uma tela travada.
 *
 * Fechar esta página **não cancela** nada: o que já saiu está marcado no banco,
 * e reabrir o boletim continua de onde parou. É por isso que o progresso vive
 * lá e não aqui.
 */
export function EnvioEmAndamento({
  boletimId,
  pendentes,
}: {
  boletimId: string;
  pendentes: number;
}) {
  const router = useRouter();
  const [restantes, setRestantes] = useState(pendentes);
  const [enviados, setEnviados] = useState(0);

  /**
   * Acompanhar o número que o servidor manda.
   *
   * `useState(pendentes)` só olha para o argumento **uma vez**, na montagem. Ao
   * clicar em "tentar de novo", o servidor devolve a página com três na fila de
   * novo, mas o componente continuava montado com o zero de antes — e o botão
   * de enviar simplesmente não aparecia. Quem estivesse usando concluiria que o
   * sistema tinha desistido.
   *
   * É o jeito que o próprio React recomenda para ajustar estado quando uma
   * propriedade muda: comparar com o valor anterior durante a renderização.
   */
  const ultimoPendentes = useRef(pendentes);
  if (ultimoPendentes.current !== pendentes) {
    ultimoPendentes.current = pendentes;
    setRestantes(pendentes);
  }
  const [erro, setErro] = useState<string | null>(null);
  const [andando, setAndando] = useState(false);
  /**
   * A marca de "esta tela saiu do ar", para o laço parar de mandar lotes.
   *
   * Ela precisa ser **desligada na montagem**, e não só ligada na saída. Em
   * desenvolvimento o React monta, desmonta e monta de novo cada componente de
   * propósito, para revelar exatamente este tipo de descuido: sem a linha de
   * baixo, a marca ficava ligada desde a primeira desmontagem e o laço nunca
   * rodava — o botão de enviar respondia ao clique e não fazia nada.
   */
  const cancelado = useRef(false);

  useEffect(() => {
    cancelado.current = false;
    return () => {
      cancelado.current = true;
    };
  }, []);

  async function andar() {
    setAndando(true);
    setErro(null);
    let faltam = restantes;

    while (faltam > 0 && !cancelado.current) {
      const passo = await mandarLote(boletimId);
      if (passo.erro) {
        setErro(passo.erro);
        break;
      }
      faltam = passo.restantes;
      setEnviados((n) => n + passo.enviados);
      setRestantes(faltam);
    }

    setAndando(false);
    router.refresh();
  }

  const total = pendentes;
  const parte = total > 0 ? Math.round(((total - restantes) / total) * 100) : 100;

  return (
    <div className="space-y-3">
      <div className="h-[8px] overflow-hidden rounded-pilula bg-linha">
        <div className="h-full rounded-pilula bg-realce transition-all" style={{ width: `${parte}%` }} />
      </div>

      <p className="tabular text-[14px] text-grafite">
        {restantes === 0
          ? `Tudo enviado — ${enviados} ${enviados === 1 ? "mensagem saiu" : "mensagens saíram"} agora.`
          : andando
            ? `Enviando… ${total - restantes} de ${total}.`
            : `Faltam ${restantes} de ${total}.`}
      </p>

      {erro && (
        <Aviso tom="erro">
          O envio parou aqui. Ninguém recebeu duas vezes: o que já saiu está marcado, e recomeçar
          continua de onde parou.
          <br />
          <span className="mt-1.5 block font-mono text-[12.5px]">{erro}</span>
        </Aviso>
      )}

      {restantes > 0 && (
        <button
          type="button"
          onClick={() => void andar()}
          disabled={andando}
          className="inline-flex min-h-[42px] items-center justify-center rounded-folha bg-heroi px-4 text-[15px] font-semibold text-heroi-tinta shadow-baixa disabled:opacity-50"
        >
          {andando ? "Enviando…" : enviados > 0 || erro ? "Continuar o envio" : "Começar o envio"}
        </button>
      )}

      {andando && (
        <p className="text-[13px] leading-relaxed text-fosco">
          Pode fechar esta página se precisar: o que já saiu fica marcado, e ao voltar aqui o envio
          continua de onde parou.
        </p>
      )}
    </div>
  );
}
