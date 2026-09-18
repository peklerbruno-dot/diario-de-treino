import { NextResponse, type NextRequest } from "next/server";

/**
 * Barreira rasa: sem cookie de sessão, nem chega a renderizar. A conferência da
 * assinatura é no servidor (`src/lib/auth.ts`) — aqui só evitamos trabalho.
 *
 * Quem já entrou é mandado de volta pela própria página de entrada, e não
 * daqui: olhar só se o cookie existe criaria um vaivém sem fim para quem
 * carregasse um cookie vencido.
 */
export function middleware(pedido: NextRequest) {
  const temCookie = pedido.cookies.has("cej_sessao");
  const { pathname } = pedido.nextUrl;

  const publica =
    pathname === "/entrar" ||
    pathname === "/fundar" ||
    pathname.startsWith("/definir-senha") ||
    pathname.startsWith("/_next");

  if (!temCookie && !publica) {
    const url = pedido.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // `/api/agenda` fica de fora: o Google busca o calendário sem cookie nenhum,
  // e um desvio para /entrar faria a agenda de todo mundo ficar vazia.
  matcher: ["/((?!api/agenda|api/saude|favicon.ico).*)"],
};
