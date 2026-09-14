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
  if (temCookie && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/saude|favicon.ico).*)"],
};
