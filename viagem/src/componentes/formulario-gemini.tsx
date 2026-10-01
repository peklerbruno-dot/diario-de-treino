"use client";

import { useActionState } from "react";
import { salvarChaveDoGemini } from "@/acoes/viagem";
import { BotaoEnviar } from "./formulario";
import { Aviso } from "./pecas";

export function FormularioDoGemini({ viagemId, ligada, pelaVercel }: { viagemId: string; ligada: boolean; pelaVercel: boolean }) {
  const [estado, agir] = useActionState(salvarChaveDoGemini, null);
  const ok = estado?.valores?.ok;
  const estaLigada = ok ? ok === "ligada" : ligada;

  if (pelaVercel) return <p className="text-[15px]">✓ Ligada (chave configurada na Vercel).</p>;

  return (
    <div className="space-y-3 text-[15px]">
      {estaLigada ? (
        <>
          <Aviso tom="ok">✓ Ligada. Posts, reels e prints já são lidos.</Aviso>
          <form action={agir}>
            <input type="hidden" name="viagemId" value={viagemId} />
            <input type="hidden" name="desligar" value="1" />
            <button className="text-[14px] text-fosco">Desligar / trocar a chave</button>
          </form>
        </>
      ) : (
        <form action={agir} className="space-y-3">
          <input type="hidden" name="viagemId" value={viagemId} />
          <p className="text-grafite">
            É o que lê os posts e prints. Grátis, 1 minuto:
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-grafite">
            <li>
              Abra <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="font-semibold text-realce">aistudio.google.com/apikey</a> (entra com sua conta Google).
            </li>
            <li>Toque em <strong>Create API key</strong> e copie a chave (começa com “AIza”).</li>
            <li>Cole aqui embaixo.</li>
          </ol>
          <input name="chave" type="password" autoComplete="off" required className="campo" placeholder="AIza…" />
          {estado?.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
          <BotaoEnviar>Ligar leitura automática</BotaoEnviar>
          <p className="text-[13px] text-fosco">A chave fica guardada cifrada no banco do app e só é usada para ler os posts de vocês.</p>
        </form>
      )}
    </div>
  );
}
