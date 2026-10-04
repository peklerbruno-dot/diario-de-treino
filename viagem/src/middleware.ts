import { NextResponse, type NextRequest } from "next/server";

/**
 * Barreira rasa: sem cookie de sessão, nem chega a renderizar. A conferência
 * da assinatura é no servidor (`src/lib/auth.ts`); aqui só se evita trabalho.
 */
export function middleware(pedido: NextRequest) {
  const { pathname, search } = pedido.nextUrl;
  const publica =
    pathname === "/entrar" ||
    pathname === "/criar-conta" ||
    pathname.startsWith("/convite/") ||
    pathname.startsWith("/_next");

  if (!pedido.cookies.has("viagem_sessao") && !publica) {
    const url = pedido.nextUrl.clone();
    url.pathname = "/entrar";
    // Volta para onde ia depois de entrar — importa no "compartilhar" do Android.
    url.search = pathname === "/" ? "" : `?volta=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // O atalho do iPhone entra pela chave própria, sem cookie.
  matcher: ["/((?!api/atalho|api/saude|api/cron|manifest.webmanifest|sw.js|offline.html|icone-|apple-touch-icon|favicon).*)"],
};
