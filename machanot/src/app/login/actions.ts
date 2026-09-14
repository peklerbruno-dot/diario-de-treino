"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { criarLinkDeEntrada, emailAutorizado, entrarComCodigo } from "@/lib/auth";
import { mostraLinkNaTela } from "@/lib/email";
import { zEmail } from "@/lib/validacao";

export interface EstadoLogin {
  mensagem?: string;
  erro?: string;
  link?: string;
}

export async function pedirLink(_anterior: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const bruto = zEmail.safeParse(form.get("email"));
  if (!bruto.success) return { erro: "Escreva um e-mail válido." };
  const email = bruto.data;

  if (!emailAutorizado(email)) {
    // Mesma resposta do caminho feliz: não contamos quem está na lista.
    return { mensagem: "Se este e-mail tiver acesso, o link chega em instantes." };
  }

  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host") ?? "localhost:3000";
  const protocolo =
    cabecalhos.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  try {
    const url = await criarLinkDeEntrada(email, `${protocolo}://${host}`);
    return {
      mensagem: "Se este e-mail tiver acesso, o link chega em instantes. Ele vale por 15 minutos.",
      ...(mostraLinkNaTela ? { link: url } : {}),
    };
  } catch (e) {
    console.error(e);
    return { erro: "Não deu para gerar o link agora." };
  }
}

/**
 * Para onde mandar depois de entrar. Só caminhos internos: "//outro.site"
 * passaria pela checagem ingênua de "começa com barra" e levaria a pessoa
 * para fora.
 */
function destinoSeguro(bruto: FormDataEntryValue | null): string {
  const destino = typeof bruto === "string" ? bruto : "";
  return destino.startsWith("/") && !destino.startsWith("//") ? destino : "/";
}

/**
 * Entrada pelo código combinado, para enquanto o envio de e-mail não estiver
 * ligado. Continua exigindo que o e-mail esteja na lista de autorizados.
 */
export async function entrarComSenha(
  _anterior: EstadoLogin,
  form: FormData,
): Promise<EstadoLogin> {
  const bruto = zEmail.safeParse(form.get("email"));
  if (!bruto.success) return { erro: "Escreva um e-mail válido." };

  const codigo = String(form.get("codigo") ?? "");
  if (codigo.trim() === "") return { erro: "Digite o código de acesso." };

  let r: { ok: boolean; motivo?: string };
  try {
    r = await entrarComCodigo(bruto.data, codigo);
  } catch (e) {
    // Banco fora do ar, por exemplo. Melhor uma frase do que uma tela de erro.
    console.error(e);
    return { erro: "O sistema não está respondendo agora. Tente de novo em instantes." };
  }
  if (!r.ok) return { erro: r.motivo ?? "Não deu para entrar." };
  redirect(destinoSeguro(form.get("de")));
}
