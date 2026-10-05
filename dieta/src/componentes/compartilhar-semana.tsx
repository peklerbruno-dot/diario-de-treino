"use client";

import { useState } from "react";
import { litros } from "@/lib/ajustes";
import { milhar } from "@/lib/analise";
import type { DiaDoHistorico, MedidaVista } from "@/lib/consultas";
import { diaCurto, diaPorExtenso, horaFalada } from "@/lib/datas";
import { linhaDoPeso, textoParaNutricionista } from "@/lib/relatorio";
import { entregarArquivo, foiCancelado } from "./arquivo";
import { Botao, Cartao } from "./pecas";

/**
 * A semana para a nutricionista: em texto (WhatsApp) ou em PDF (com as fotos
 * dos pratos). Sai pelo compartilhar do iPhone; onde não houver compartilhar,
 * o texto vai para a área de transferência e o PDF é baixado.
 */

type Props = { dias: DiaDoHistorico[]; medidas: MedidaVista[]; metaDeAgua: number; nomeDoPlano: string };

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const ESTADO = { seguiu: "segui", trocou: "troquei", pulou: "pulei" } as Record<string, string>;

export function CompartilharSemana({ dias, medidas, metaDeAgua, nomeDoPlano }: Props) {
  const [recado, setRecado] = useState("");
  const [gerando, setGerando] = useState(false);
  const semana = dias.slice(0, 7);
  const desde = semana[semana.length - 1]?.dia ?? "";
  const extras = linhaDoPeso(medidas, desde);
  const texto = () => textoParaNutricionista(semana.map((d) => ({ ...d, fotos: d.fotos.length })), metaDeAgua, nomeDoPlano, extras);

  const enviarTexto = async () => {
    try {
      if (navigator.share) await navigator.share({ text: texto() });
      else {
        await navigator.clipboard.writeText(texto());
        setRecado("Resumo copiado. É só colar no WhatsApp ou no e-mail.");
      }
    } catch {
      /* fechou o compartilhar: tudo bem */
    }
  };

  const enviarPdf = async () => {
    setRecado("");
    setGerando(true);
    try {
      await entregarArquivo(await montarPdf(semana, texto(), desde));
    } catch (e) {
      if (!foiCancelado(e)) setRecado("Não consegui gerar o PDF agora.");
    } finally {
      setGerando(false);
    }
  };

  return (
    <Cartao className="mb-4">
      <p className="font-semibold">Para a nutricionista</p>
      <p className="mt-0.5 text-[14px] text-grafite">A semana: quanto seguiu do plano, água, peso, trocas e o que mais pulou.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Botao tipo="primario" onClick={enviarTexto}>
          Texto da semana
        </Botao>
        <Botao onClick={enviarPdf} disabled={gerando}>
          {gerando ? "Gerando…" : "PDF com fotos"}
        </Botao>
      </div>
      {recado && <p className="mt-2 text-[14px] text-grafite">{recado}</p>}
    </Cartao>
  );
}

/** Uma foto do servidor → data URL, reduzida, para caber no PDF. */
async function fotoComoDataUrl(id: string): Promise<string | null> {
  try {
    const r = await fetch(`/api/foto/${id}`);
    if (!r.ok) return null;
    const bitmap = await createImageBitmap(await r.blob());
    const lado = 360;
    const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
    const tela = document.createElement("canvas");
    tela.width = Math.round(bitmap.width * escala);
    tela.height = Math.round(bitmap.height * escala);
    tela.getContext("2d")!.drawImage(bitmap, 0, 0, tela.width, tela.height);
    return tela.toDataURL("image/jpeg", 0.75);
  } catch {
    return null;
  }
}

/**
 * As fontes embutidas do PDF só conhecem o alfabeto latino (WinAnsi): "≈", o
 * sinal de menos e emoji sairiam como lixo. Troca o que tem equivalente e tira
 * o resto.
 */
const WIN_ANSI = new Set("—–•“”‘’…€".split(""));
export const paraPdf = (s: string) =>
  s
    .replace(/≈/g, "~")
    .replace(/−/g, "-")
    .replace(/×/g, "x")
    .split("")
    .filter((c) => c.charCodeAt(0) <= 0xff || WIN_ANSI.has(c))
    .join("")
    .replace(/ {2,}/g, " ")
    .trim();

async function montarPdf(semana: DiaDoHistorico[], resumo: string, desde: string): Promise<File> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 16;
  const largura = 210 - 2 * M;
  let y = M;
  const novaPaginaSe = (altura: number) => {
    if (y + altura > 297 - M) {
      doc.addPage();
      y = M;
    }
  };

  // Resumo
  const [titulo, ...resto] = resumo.split("\n").map(paraPdf);
  doc.setFont("helvetica", "bold").setFontSize(16).text(titulo, M, y);
  y += 8;
  doc.setFont("helvetica", "normal").setFontSize(10.5);
  for (const linha of resto) {
    const partes = doc.splitTextToSize(linha || " ", largura) as string[];
    novaPaginaSe(partes.length * 5);
    doc.text(partes, M, y);
    y += partes.length * 5;
  }

  // Dia a dia
  y += 4;
  novaPaginaSe(12);
  doc.setFont("helvetica", "bold").setFontSize(12).text("Dia a dia", M, y);
  y += 6;
  doc.setFontSize(10);
  for (const d of [...semana].reverse()) {
    const linhas = d.registros.map((r) => paraPdf(`${horaFalada(r.horario)} ${r.nome}: ${ESTADO[r.estado] ?? r.estado}${r.nota ? ` (${r.nota})` : ""}`));
    const cabecalho = paraPdf(`${maiuscula(diaPorExtenso(d.dia))} — água ${litros(d.agua)}${d.calorias ? ` · ≈ ${milhar(d.calorias)} kcal pelas fotos` : ""}`);
    const corpo = (linhas.length ? linhas : ["sem refeições marcadas"]).flatMap((l) => doc.splitTextToSize(`• ${l}`, largura - 4) as string[]);
    novaPaginaSe(6 + corpo.length * 4.6);
    doc.setFont("helvetica", "bold").text(cabecalho, M, y);
    y += 5;
    doc.setFont("helvetica", "normal").text(corpo, M + 2, y);
    y += corpo.length * 4.6 + 2;
  }

  // Fotos
  const fotos = semana.flatMap((d) => d.fotos).filter((f) => f.temImagem).slice(0, 15);
  if (fotos.length) {
    y += 4;
    novaPaginaSe(14);
    doc.setFont("helvetica", "bold").setFontSize(12).text("Fotos dos pratos", M, y);
    y += 5;
    const lado = (largura - 2 * 4) / 3;
    let coluna = 0;
    for (const f of fotos) {
      const imagem = await fotoComoDataUrl(f.id);
      if (!imagem) continue;
      if (coluna === 0) novaPaginaSe(lado + 10);
      const x = M + coluna * (lado + 4);
      doc.addImage(imagem, "JPEG", x, y, lado, lado * 0.75);
      doc.setFont("helvetica", "normal").setFontSize(8.5);
      const legenda = paraPdf(`${diaCurto(f.dia)} ${horaFalada(f.hora)} ${f.nome}${f.analise ? ` · ≈${milhar(f.analise.calorias)} kcal` : ""}`);
      doc.text(doc.splitTextToSize(legenda, lado) as string[], x, y + lado * 0.75 + 3.5);
      coluna = (coluna + 1) % 3;
      if (coluna === 0) y += lado * 0.75 + 10;
    }
  }

  const blob = doc.output("blob");
  return new File([blob], `dieta-semana-${desde}.pdf`, { type: "application/pdf" });
}
