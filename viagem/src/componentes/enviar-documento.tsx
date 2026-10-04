"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { enviarDocumento, itensParaORoteiro, type ItemSugerido } from "@/acoes/documentos";
import { curta } from "@/lib/datas";
import { reduzir } from "./imagem";
import { Aviso } from "./pecas";

const TIPOS = [
  ["outro", "Descobrir sozinho / outro"],
  ["voo", "✈️ Voo"],
  ["hospedagem", "🏨 Hospedagem"],
  ["passeio", "🎟️ Passeio / ingresso"],
  ["transporte", "🚌 Transporte"],
  ["seguro", "🛡️ Seguro"],
] as const;

const LIMITE = 3_300_000;

async function lerArquivo(f: File): Promise<{ mime: string; base64: string; tamanho: number }> {
  // Imagem é reduzida no celular (um print de iPhone tem 3 MB); PDF vai como está.
  if (f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name)) {
    const r = await reduzir(f);
    return { mime: r.tipo, base64: r.base64, tamanho: Math.round((r.base64.length * 3) / 4) };
  }
  const buf = new Uint8Array(await f.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { mime: f.type || "application/pdf", base64: btoa(bin), tamanho: buf.length };
}

export function EnviarDocumento({ viagemId, temLeitura }: { viagemId: string; temLeitura: boolean }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("outro");
  const [ler, setLer] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [itens, setItens] = useState<(ItemSugerido & { usar: boolean })[]>([]);
  const [feito, setFeito] = useState("");

  async function enviar() {
    if (!arquivo) return;
    setErro("");
    setAviso("");
    setFeito("");
    setEnviando(true);
    try {
      const a = await lerArquivo(arquivo);
      if (a.tamanho > LIMITE) {
        setErro("Arquivo grande demais (máximo ~3 MB). Mande um print da parte importante.");
        return;
      }
      const r = await enviarDocumento(viagemId, { nome: arquivo.name, mime: a.mime, base64: a.base64, titulo, tipo, notas: "", ler: ler && temLeitura });
      if (r.erro) return setErro(r.erro);
      setArquivo(null);
      setTitulo("");
      if (entrada.current) entrada.current.value = "";
      if (r.aviso) setAviso(r.aviso);
      setItens((r.itens ?? []).map((i) => ({ ...i, usar: i.dentro })));
      if (!r.itens?.length) setFeito("Documento guardado.");
      router.refresh();
    } catch {
      setErro("A conexão caiu no envio. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarItens() {
    const escolhidos = itens.filter((i) => i.usar);
    const r = await itensParaORoteiro(viagemId, escolhidos);
    setItens([]);
    setFeito(`Documento guardado e ${r.n} ${r.n === 1 ? "item posto" : "itens postos"} no roteiro.`);
    router.refresh();
  }

  if (itens.length) {
    return (
      <div className="space-y-3">
        <p className="font-semibold">Achei isto no documento. Pôr no roteiro?</p>
        {itens.map((i, k) => (
          <label key={k} className={`flex items-start gap-3 rounded-folha border border-regua p-3 ${i.dentro ? "" : "opacity-60"}`}>
            <input
              type="checkbox"
              checked={i.usar}
              disabled={!i.dentro}
              onChange={(e) => setItens((xs) => xs.map((x, j) => (j === k ? { ...x, usar: e.target.checked } : x)))}
              className="mt-1 h-5 w-5 accent-[var(--realce)]"
            />
            <span className="text-[15px]">
              <strong>{curta(i.dia)}{i.hora && ` · ${i.hora}`}</strong> — {i.titulo}
              {i.notas && <span className="block text-[13px] text-fosco">{i.notas}</span>}
              {!i.dentro && <span className="block text-[13px] text-ambar">Fora das datas da viagem</span>}
            </span>
          </label>
        ))}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setItens([])} className="botao-leve">Não, obrigado</button>
          <button type="button" onClick={confirmarItens} className="botao">Pôr no roteiro</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => entrada.current?.click()} className="botao-leve w-full">
        {arquivo ? `📄 ${arquivo.name}` : "📎 Escolher PDF ou foto"}
      </button>
      <input ref={entrada} type="file" accept="application/pdf,image/*" hidden onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
      {arquivo && (
        <>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="campo" placeholder={temLeitura ? "Título (deixe vazio que eu leio)" : "Título (ex.: Voo de ida)"} />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="campo" aria-label="Tipo">
            {TIPOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
          {temLeitura && (
            <label className="flex items-center gap-2 text-[15px]">
              <input type="checkbox" checked={ler} onChange={(e) => setLer(e.target.checked)} className="h-5 w-5 accent-[var(--realce)]" />
              Ler e sugerir horários para o roteiro
            </label>
          )}
          <button type="button" onClick={enviar} disabled={enviando} className="botao w-full">
            {enviando ? (ler && temLeitura ? "Guardando e lendo…" : "Guardando…") : "Guardar documento"}
          </button>
        </>
      )}
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {aviso && <Aviso tom="atencao">{aviso}</Aviso>}
      {feito && <Aviso tom="ok">{feito}</Aviso>}
    </div>
  );
}
