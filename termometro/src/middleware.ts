import { NextResponse, type NextRequest } from "next/server";

/**
 * Barreira rasa: sem cookie de sessão, nem chega a renderizar. A conferência da
 * assinatura é no servidor (src/lib/auth.ts) — aqui só evitamos trabalho.
 *
 * Quem já entrou é mandado de volta pela própria página de entrada, e não
 * daqui: olhar só se o cookie existe criava um vaivém sem fim para quem
 * carregasse um cookie velho (a entrada mandava para "/", que não aceitava a
 * sessão e mandava de volta para a entrada).
 */
export function middleware(req: NextRequest) {
  const temCookie = req.cookies.has("termometro_sessao");
  const { pathname } = req.nextUrl;

  // Os ícones e o manifesto precisam sair sem sessão. O iOS busca o
  // apple-touch-icon com a página de entrada aberta, antes de existir cookie
  // nenhum: se ele levar um desvio para /entrar, o atalho na tela de início
  // nasce com o quadrado cinza de sempre em vez do ícone do app.
  const publica =
    pathname === "/entrar" ||
    pathname.startsWith("/_next") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/apple-touch-icon.png" ||
    pathname.startsWith("/icone");

  if (!temCookie && !publica) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/saude|favicon.ico).*)"],
};
