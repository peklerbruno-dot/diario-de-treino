/**
 * A equipe escreve links do jeito que fala: "chazit.org.br", "@chazitsp",
 * "(11) 99999-9999". Aqui cada um vira um endereço que funciona.
 */

/** Endereço completo, caminho do próprio site, ou vazio se não for um link aceitável. */
export function normalizarLink(bruto: string): string {
  const t = bruto.trim();
  if (!t) return "";
  if (t.startsWith("/") && !t.startsWith("//")) return t;
  if (/^mailto:[^\s]+@[^\s]+$/i.test(t)) return t;
  if (/^https?:\/\/[^\s]+\.[^\s]+$/i.test(t)) return t;
  // "chazit.org.br/agenda", "forms.gle/abc": sem esquema, mas com cara de site.
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s]*)?$/i.test(t)) return `https://${t}`;
  // Um e-mail solto vira link de e-mail.
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return `mailto:${t}`;
  return "";
}

export function ehExterno(link: string): boolean {
  return /^https?:\/\//i.test(link);
}

/** "(11) 99999-9999" → https://wa.me/5511999999999. Sem DDI, assume o Brasil. */
export function linkWhatsapp(numero: string): string {
  let d = numero.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  if (d.length < 12) return "";
  return `https://wa.me/${d}`;
}

/** "@chazitsp", "chazitsp" ou o endereço do perfil → endereço do perfil. */
export function linkInstagram(texto: string): string {
  const t = texto.trim();
  if (!t) return "";
  const doEndereco = t.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  const usuario = doEndereco?.[1] ?? t.replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(usuario)) return "";
  return `https://www.instagram.com/${usuario}/`;
}

/** Como mostrar o perfil na tela: sempre "@usuario". */
export function arrobaInstagram(texto: string): string {
  const link = linkInstagram(texto);
  const m = link.match(/instagram\.com\/([^/]+)\//);
  return m ? `@${m[1]}` : "";
}
