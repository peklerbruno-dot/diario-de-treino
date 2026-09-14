"use server";

import { headers } from "next/headers";
import { criarLinkDeEntrada, emailAutorizado } from "@/lib/auth";
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
