/**
 * A casca das telas que gente de fora vê: inscrição, descadastro, certificado e
 * a agenda aberta.
 *
 * Diferente da casca de dentro de propósito. Aqui não há navegação, não há
 * abas, não há nada a administrar: quem chega veio por um link, com uma coisa
 * só para fazer. Uma barra de navegação nesta página seria um convite a clicar
 * em algo que vai pedir senha.
 */
export function PaginaPublica({
  children,
  largura = "estreita",
}: {
  children: React.ReactNode;
  largura?: "estreita" | "larga";
}) {
  return (
    <main
      className={`mx-auto px-6 py-12 ${largura === "larga" ? "max-w-3xl" : "max-w-xl"}`}
    >
      <header className="mb-8">
        <p className="sobrescrito">Universidade de São Paulo</p>
        <p className="mt-1 font-titulo text-[21px] font-semibold tracking-tight">
          Centro de Estudos Judaicos
        </p>
      </header>
      {children}
      <footer className="mt-12 border-t border-linha pt-5 text-[12.5px] leading-relaxed text-fosco">
        Centro de Estudos Judaicos · Faculdade de Filosofia, Letras e Ciências Humanas ·
        Universidade de São Paulo
      </footer>
    </main>
  );
}
