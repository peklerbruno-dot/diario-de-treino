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

  const publica =
    pathname === "/entrar" ||
    pathname.startsWith("/_next") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icones");

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
