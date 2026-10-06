import { NextResponse, type NextRequest } from "next/server";

/**
 * Barreira rasa: sem cookie de sessão, nem chega a renderizar. A conferência da
 * assinatura é no servidor (src/lib/auth.ts) — aqui só evitamos trabalho.
 */
export function middleware(req: NextRequest) {
  const temCookie = req.cookies.has("central_sessao");
  const { pathname } = req.nextUrl;

  const publica =
    pathname === "/entrar" ||
    pathname.startsWith("/_next") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/apple-touch-icon.png" ||
    pathname.startsWith("/icone");

  if (!temCookie && pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });
  }
  if (!temCookie && !publica) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // /api/sincronizar fica de fora: o agendador diário da Vercel chega sem
  // cookie, e a rota confere o CRON_SECRET por conta própria.
  matcher: ["/((?!api/saude|api/sincronizar|favicon.ico).*)"],
};
