"use client";

import { useRef, useState } from "react";
import { CORES, LIMITE_ARQUIVO, LISTA_CORES, type Campo } from "@/lib/esquema";
import { enviarArquivo } from "@/lib/acoes";
import { prepararImagem } from "./preparar-imagem";

const classeEntrada =
  "w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 font-corpo text-[17px] text-slate-900 outline-none transition focus:border-azul focus:ring-4 focus:ring-azul/20";

/** Um campo do formulário, escolhido pelo tipo que o esquema diz. */
export function CampoFormulario({
  campo,
  valor,
  mudar,
}: {
  campo: Campo;
  valor: string;
  mudar: (v: string) => void;
}) {
  const id = `campo-${campo.nome}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-titulo text-sm font-bold text-marinho">
        {campo.rotulo}
        {campo.obrigatorio ? <span className="text-red-600"> *</span> : null}
      </label>
      {campo.tipo === "textoLongo" ? (
        <textarea
          id={id}
          value={valor}
          onChange={(e) => mudar(e.target.value)}
          rows={valor.length > 400 ? 12 : 5}
          placeholder={campo.exemplo}
          className={`${classeEntrada} min-h-[7rem] resize-y leading-relaxed`}
        />
      ) : campo.tipo === "imagem" || campo.tipo === "arquivo" ? (
        <CampoEnvio id={id} campo={campo} valor={valor} mudar={mudar} />
      ) : campo.tipo === "cor" ? (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={campo.rotulo}>
          {LISTA_CORES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={valor === c}
              onClick={() => mudar(c)}
              className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 font-corpo text-sm font-bold text-marinho ${
                valor === c ? "border-marinho ring-4 ring-marinho/15" : "border-transparent"
              }`}
              style={{ background: CORES[c].fundo }}
            >
              {valor === c ? "✓ " : ""}
              {CORES[c].nome}
            </button>
          ))}
        </div>
      ) : (
        <input
          id={id}
          type={campo.tipo === "data" ? "date" : campo.tipo === "hora" ? "time" : "text"}
          inputMode={campo.tipo === "link" ? "url" : undefined}
          value={valor}
          onChange={(e) => mudar(e.target.value)}
          placeholder={campo.exemplo ?? (campo.tipo === "link" ? "https://… ou /contato" : undefined)}
          className={classeEntrada}
        />
      )}
      {campo.dica ? <p className="mt-1.5 font-corpo text-[13px] text-slate-500">{campo.dica}</p> : null}
      {campo.tipo === "textoLongo" ? (
        <p className="mt-1.5 font-corpo text-[13px] text-slate-500">
          Linha em branco separa parágrafos. **Assim** fica em <strong>negrito</strong>. Links viram links sozinhos.
        </p>
      ) : null}
    </div>
  );
}

function CampoEnvio({ id, campo, valor, mudar }: { id: string; campo: Campo; valor: string; mudar: (v: string) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const ehImagem = campo.tipo === "imagem";

  async function enviar(f: File | undefined) {
    if (!f) return;
    setErro("");
    setEnviando(true);
    try {
      const pronto = f.type.startsWith("image/") ? await prepararImagem(f) : f;
      if (pronto.size > LIMITE_ARQUIVO) {
        setErro("Arquivo grande demais: o máximo é 4 MB.");
        return;
      }
      const fd = new FormData();
      fd.append("arquivo", pronto);
      const r = await enviarArquivo(fd);
      if (r.ok && r.id) {
        mudar(r.id);
        setNomeArquivo(f.name);
      } else if (!r.ok) setErro(r.erro);
    } catch {
      setErro("O envio falhou. Confira a internet e tente de novo.");
    } finally {
      setEnviando(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastando(false);
        void enviar(e.dataTransfer.files[0]);
      }}
      className={`rounded-xl border-2 border-dashed p-3 transition ${arrastando ? "border-azul bg-azul/10" : "border-slate-300 bg-slate-50"}`}
    >
      {valor && ehImagem ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/arquivos/${valor}`} alt="" className="mb-3 max-h-48 w-full rounded-lg object-contain" />
      ) : null}
      {valor && !ehImagem ? (
        <p className="mb-3 font-corpo text-sm text-slate-700">
          📄 {nomeArquivo || "Arquivo enviado"} ·{" "}
          <a href={`/arquivos/${valor}`} target="_blank" rel="noreferrer" className="text-azul underline">
            abrir
          </a>
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          id={id}
          disabled={enviando}
          onClick={() => entrada.current?.click()}
          className="rounded-xl bg-azul px-4 py-2.5 font-titulo text-sm font-bold text-white hover:bg-marinho disabled:opacity-60"
        >
          {enviando ? "Enviando…" : valor ? (ehImagem ? "Trocar foto" : "Trocar arquivo") : ehImagem ? "📷 Escolher foto" : "📎 Escolher arquivo"}
        </button>
        {valor && !enviando ? (
          <button
            type="button"
            onClick={() => mudar("")}
            className="rounded-xl px-3 py-2.5 font-corpo text-sm font-bold text-red-700 hover:bg-red-50"
          >
            Tirar
          </button>
        ) : null}
        {!valor && !enviando ? <span className="font-corpo text-[13px] text-slate-500">ou arraste aqui</span> : null}
      </div>
      <input
        ref={entrada}
        type="file"
        accept={ehImagem ? "image/*" : "application/pdf,image/*"}
        className="hidden"
        onChange={(e) => void enviar(e.target.files?.[0])}
      />
      {erro ? <p className="mt-2 font-corpo text-sm font-bold text-red-700">{erro}</p> : null}
    </div>
  );
}
