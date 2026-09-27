import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assinaturaValida, dividir, extrairMensagens, mesmoNumero, paraWhatsapp } from "./formato";

describe("assinaturaValida", () => {
  const corpo = '{"entry":[]}';
  const assinatura = "sha256=" + createHmac("sha256", "segredo").update(corpo).digest("hex");
  it("aceita a assinatura da Meta", () => expect(assinaturaValida(corpo, assinatura, "segredo")).toBe(true));
  it("recusa corpo alterado, segredo errado ou cabeçalho ausente", () => {
    expect(assinaturaValida(corpo + " ", assinatura, "segredo")).toBe(false);
    expect(assinaturaValida(corpo, assinatura, "outro")).toBe(false);
    expect(assinaturaValida(corpo, null, "segredo")).toBe(false);
    expect(assinaturaValida(corpo, "sha256=zz", "segredo")).toBe(false);
  });
});

describe("mesmoNumero", () => {
  it("ignora formatação", () => expect(mesmoNumero("+55 (11) 91234-5678", "5511912345678")).toBe(true));
  it("entende o celular brasileiro sem o nono dígito", () => {
    expect(mesmoNumero("551112345678", "5511912345678")).toBe(true);
    expect(mesmoNumero("5511912345678", "551112345678")).toBe(true);
  });
  it("não confunde números diferentes", () => {
    expect(mesmoNumero("5511912345679", "5511912345678")).toBe(false);
    expect(mesmoNumero("5511912345678", "")).toBe(false);
  });
});

describe("extrairMensagens", () => {
  const aviso = (mensagens: object[]) => ({ entry: [{ changes: [{ value: { messages: mensagens } }] }] });

  it("texto", () => {
    expect(extrairMensagens(aviso([{ id: "a", from: "55", type: "text", text: { body: "oi" } }]))).toEqual([
      { id: "a", de: "55", tipo: "texto", texto: "oi" },
    ]);
  });
  it("foto com legenda", () => {
    const [m] = extrairMensagens(
      aviso([{ id: "b", from: "55", type: "image", image: { id: "m1", mime_type: "image/jpeg", caption: "o que é?" } }]),
    );
    expect(m).toMatchObject({ tipo: "imagem", midiaId: "m1", legenda: "o que é?" });
  });
  it("áudio vira 'outro'", () => {
    expect(extrairMensagens(aviso([{ id: "c", from: "55", type: "audio", audio: {} }]))[0]).toMatchObject({
      tipo: "outro",
      descricao: "audio",
    });
  });
  it("aviso de entrega (statuses) não traz mensagem", () => {
    expect(extrairMensagens({ entry: [{ changes: [{ value: { statuses: [{}] } }] }] })).toEqual([]);
    expect(extrairMensagens(null)).toEqual([]);
  });
});

describe("paraWhatsapp", () => {
  it("converte o markdown que escapa", () => {
    expect(paraWhatsapp("## Resumo\n**Importante**: veja [o site](https://x.com)\n- um\n- dois")).toBe(
      "*Resumo*\n*Importante*: veja o site (https://x.com)\n• um\n• dois",
    );
  });
  it("deixa a formatação do WhatsApp como está", () => {
    expect(paraWhatsapp("*negrito* e _itálico_")).toBe("*negrito* e _itálico_");
  });
});

describe("dividir", () => {
  it("não mexe em texto curto", () => expect(dividir("oi")).toEqual(["oi"]));
  it("corta entre parágrafos e respeita o limite", () => {
    const texto = ["a".repeat(60), "b".repeat(60), "c".repeat(60)].join("\n\n");
    const partes = dividir(texto, 130);
    expect(partes).toEqual(["a".repeat(60) + "\n\n" + "b".repeat(60), "c".repeat(60)]);
    expect(partes.every((p) => p.length <= 130)).toBe(true);
  });
});
