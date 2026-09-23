import type { Dados } from "@/lib/esquema";
import { arrobaInstagram, linkInstagram, linkWhatsapp, normalizarLink } from "@/lib/links";
import { IconeEmail, IconeFacebook, IconeInstagram, IconeWhatsapp, IconeYoutube } from "./Icones";

/** Os canais que a equipe preencheu em "Contato", já como links. Vazio some. */
export function canais(info: Dados) {
  return [
    { chave: "instagram", href: linkInstagram(info.instagram ?? ""), rotulo: arrobaInstagram(info.instagram ?? ""), nome: "Instagram", Icone: IconeInstagram },
    { chave: "whatsapp", href: linkWhatsapp(info.whatsapp ?? ""), rotulo: info.whatsapp ?? "", nome: "WhatsApp", Icone: IconeWhatsapp },
    { chave: "email", href: info.email ? `mailto:${info.email}` : "", rotulo: info.email ?? "", nome: "E-mail", Icone: IconeEmail },
    { chave: "facebook", href: normalizarLink(info.facebook ?? ""), rotulo: "Facebook", nome: "Facebook", Icone: IconeFacebook },
    { chave: "youtube", href: normalizarLink(info.youtube ?? ""), rotulo: "YouTube", nome: "YouTube", Icone: IconeYoutube },
  ].filter((c) => c.href);
}
