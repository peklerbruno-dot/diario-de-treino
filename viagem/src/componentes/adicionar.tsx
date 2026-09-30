"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { enviarPost } from "@/acoes/lugares";
import { Aviso } from "./pecas";

const MAXIMO = 10;
const LADO = 1400;

/**
 * Reduz o print no próprio celular antes de subir. Um print de iPhone tem uns
 * 3 MB; reduzido a 1400 px de lado e JPEG, fica com uns 200 KB e continua
 * legível para o Gemini. Sem isso, três prints já passariam do limite de
 * 4,5 MB que a Vercel aceita por envio.
 */
async function reduzir(arquivo: File): Promise<{ tipo: string; base64: string; previa: string }> {
  const bitmap = await createImageBitmap(arquivo).catch(async () => {
    // Safari antigo sem createImageBitmap para HEIC: cai no <img>.
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  });
  const largura = "width" in bitmap ? bitmap.width : 0;
  const altura = "height" in bitmap ? bitmap.height : 0;
  const escala = Math.min(1, LADO / Math.max(largura, altura));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(largura * escala);
  canvas.height = Math.round(altura * escala);
  canvas.getContext("2d")!.drawImage(bitmap as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
  return { tipo: "image/jpeg", base64: dataUrl.split(",")[1], previa: dataUrl };
}

export function Adicionar({ viagemId, textoInicial = "", temLeitura }: { viagemId: string; textoInicial?: string; temLeitura: boolean }) {
  const router = useRouter();
  const [texto, setTexto] = useState(textoInicial);
  const [imagens, setImagens] = useState<{ tipo: string; base64: string; previa: string }[]>([]);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState("");
  const entrada = useRef<HTMLInputElement>(null);

  async function escolher(lista: FileList | null) {
    if (!lista) return;
    setErro("");
    const arquivos = [...lista].filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    const vagas = MAXIMO - imagens.length;
    if (arquivos.length > vagas) setErro(`Cabem ${MAXIMO} prints por vez; peguei os ${vagas} primeiros.`);
    try {
      const reduzidas = await Promise.all(arquivos.slice(0, vagas).map(reduzir));
      setImagens((xs) => [...xs, ...reduzidas]);
    } catch {
      setErro("Não consegui abrir uma das imagens. Tente um print (PNG ou JPEG).");
    }
    if (entrada.current) entrada.current.value = "";
  }

  async function ler() {
    setErro("");
    setLendo(true);
    try {
      const r = await enviarPost(viagemId, { texto, imagens: imagens.map(({ tipo, base64 }) => ({ tipo, base64 })) });
      if (r.erro) setErro(r.erro);
      else if (r.id) router.push(`/v/${viagemId}/caixa/${r.id}`);
    } catch {
      setErro("A conexão caiu no meio do envio. Tente de novo.");
    } finally {
      setLendo(false);
    }
  }

  const vazio = !texto.trim() && imagens.length === 0;

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="rotulo">Link, texto ou nome do lugar</span>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={4}
          className="campo"
          placeholder={"Cole o link do reel ou do post do Instagram, um link do Google Maps, um texto com dicas — ou só o nome: “Contramar, CDMX”"}
        />
      </label>

      <div>
        <span className="rotulo">Prints (carrossel, reel, stories)</span>
        <div className="grid grid-cols-4 gap-2">
          {imagens.map((img, i) => (
            <div key={i} className="relative aspect-[9/16] overflow-hidden rounded-folha border border-linha">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.previa} alt={`Print ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setImagens((xs) => xs.filter((_, k) => k !== i))}
                className="absolute right-1 top-1 h-7 w-7 rounded-full bg-black/60 text-white"
                aria-label={`Tirar o print ${i + 1}`}
              >
                ×
              </button>
            </div>
          ))}
          {imagens.length < MAXIMO && (
            <button
              type="button"
              onClick={() => entrada.current?.click()}
              className="flex aspect-[9/16] flex-col items-center justify-center gap-1 rounded-folha border-2 border-dashed border-regua text-fosco"
            >
              <span className="text-2xl">+</span>
              <span className="text-[12px]">Prints</span>
            </button>
          )}
        </div>
        <input ref={entrada} type="file" accept="image/*" multiple hidden onChange={(e) => escolher(e.target.files)} />
        <p className="mt-2 text-[13px] text-fosco">
          Para carrossel com os lugares nas imagens, mande um print de cada slide — é o jeito garantido de ler tudo.
        </p>
      </div>

      {!temLeitura && (
        <Aviso tom="atencao">A leitura automática está desligada (falta a GEMINI_API_KEY). Links do Google Maps e nomes digitados funcionam; posts e prints, não.</Aviso>
      )}
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      <button type="button" onClick={ler} disabled={vazio || lendo} className="botao w-full">
        {lendo ? "Lendo o post… (uns segundos)" : "Ler e sugerir lugares"}
      </button>
    </div>
  );
}
