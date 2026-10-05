"use client";

import { useState } from "react";
import { entregarArquivo, foiCancelado } from "./arquivo";
import { Botao, Cartao } from "./pecas";

/**
 * Backup: os dados num JSON, ou tudo (dados e fotos) num ZIP. O ZIP é montado
 * aqui no aparelho, foto a foto: a Vercel não devolve mais de 4,5 MB de uma
 * vez, e um mês de fotos já passa disso.
 */

type Exportado = { fotos: { id: string; dia: string; hora: string; nome: string; tipo: string }[]; fotosDoCorpo: { id: string; dia: string }[] };

const limpo = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w-]+/g, "-")
    .replace(/^-|-$/g, "") || "foto";

export function Backup({ hoje }: { hoje: string }) {
  const [andamento, setAndamento] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const baixarDados = async () => {
    const r = await fetch("/api/exportar");
    if (!r.ok) throw new Error();
    return r;
  };

  const soDados = async () => {
    setOcupado(true);
    setAndamento("");
    try {
      const r = await baixarDados();
      await entregarArquivo(new File([await r.blob()], `dieta-backup-${hoje}.json`, { type: "application/json" }));
    } catch (e) {
      if (!foiCancelado(e)) setAndamento("Não consegui gerar o backup agora.");
    } finally {
      setOcupado(false);
    }
  };

  const tudo = async () => {
    setOcupado(true);
    setAndamento("Juntando os dados…");
    try {
      const texto = await (await baixarDados()).text();
      const dados = JSON.parse(texto) as Exportado;
      const { zipSync, strToU8 } = await import("fflate");
      const arquivos: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = { "dados.json": strToU8(texto) };

      const fila = [
        ...dados.fotos.filter((f) => f.tipo).map((f) => ({ url: `/api/foto/${f.id}`, nome: `pratos/${f.dia}_${f.hora.replace(":", "h")}_${limpo(f.nome)}_${f.id.slice(-6)}.jpg` })),
        ...dados.fotosDoCorpo.map((f) => ({ url: `/api/corpo/${f.id}`, nome: `corpo/${f.dia}_${f.id.slice(-6)}.jpg` })),
      ];
      const total = fila.length;
      let feitas = 0;
      let falhas = 0;
      // Quatro de cada vez: rápido sem afogar a conexão do celular.
      const trabalhar = async () => {
        for (let item = fila.shift(); item; item = fila.shift()) {
          try {
            const r = await fetch(item.url);
            if (!r.ok) throw new Error();
            // JPEG já é comprimido: guardar sem recomprimir (level 0) é bem mais rápido.
            arquivos[item.nome] = [new Uint8Array(await r.arrayBuffer()), { level: 0 }];
          } catch {
            falhas++;
          }
          feitas++;
          setAndamento(`Baixando as fotos: ${feitas} de ${total}…`);
        }
      };
      await Promise.all([trabalhar(), trabalhar(), trabalhar(), trabalhar()]);

      setAndamento("Montando o ZIP…");
      const zip = zipSync(arquivos);
      await entregarArquivo(new File([zip], `dieta-backup-${hoje}.zip`, { type: "application/zip" }));
      setAndamento(falhas ? `Pronto, mas ${falhas} foto(s) não vieram. Tente de novo com uma conexão melhor.` : "Pronto.");
    } catch (e) {
      setAndamento(foiCancelado(e) ? "" : "Não consegui gerar o backup agora.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Cartao>
      <p className="font-semibold">Backup</p>
      <p className="mt-0.5 text-[14px] text-grafite">
        Uma cópia de tudo o que está no app — planos, marcações, água, peso e fotos — para guardar no Arquivos, no Drive ou no e-mail.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Botao tipo="primario" onClick={tudo} disabled={ocupado}>
          Tudo, com fotos
        </Botao>
        <Botao onClick={soDados} disabled={ocupado}>
          Só os dados
        </Botao>
      </div>
      {andamento && (
        <p className="mt-2 text-[14px] text-grafite" role="status">
          {andamento}
        </p>
      )}
    </Cartao>
  );
}
