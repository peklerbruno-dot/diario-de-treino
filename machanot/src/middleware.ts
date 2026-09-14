import { NextResponse, type NextRequest } from "next/server";

/**
 * Barreira rasa: sem cookie de sessão, nem chega a renderizar.
 * A conferência da assinatura acontece no servidor (src/lib/auth.ts) —
 * aqui só evitamos trabalho e vazamento de rota.
 */
export function middleware(req: NextRequest) {
  const temCookie = req.cookies.has("machanot_sessao");
  const { pathname } = req.nextUrl;

  const publica = pathname === "/login" || pathname.startsWith("/_next");

  if (!temCookie && !publica) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?de=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  // Quem já entrou é mandado de volta para a lista pela própria página de
  // entrada, que confere a assinatura do cookie. Fazer isso aqui, olhando só
  // se o cookie existe, criava um vaivém sem fim para quem carregasse um
  // cookie velho ou inválido: o /login mandava para "/", que não aceitava a
  // sessão e mandava de volta para /login.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/saude|favicon.ico).*)"],
};
