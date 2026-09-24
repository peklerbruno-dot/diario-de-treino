/**
 * Os ícones da navegação. Desenhados aqui, em traço, para não trazer uma
 * biblioteca inteira por causa de meia dúzia de desenhos — e para que a
 * espessura do traço combine com a do resto da tela.
 *
 * São decorativos: quem lê por leitor de tela ouve o nome da aba, que está
 * escrito ao lado.
 */
function Traco({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const IconeHoje = () => (
  <Traco>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M8 3v4M16 3v4M3 10h18" />
    <circle cx="12" cy="15.5" r="1.6" fill="currentColor" stroke="none" />
  </Traco>
);

export const IconeMes = () => (
  <Traco>
    <rect x="3" y="4" width="18" height="17" rx="3" />
    <path d="M3 9h18M8 13h8M8 17h5" />
  </Traco>
);

export const IconeAno = () => (
  <Traco>
    <path d="M4 18l5-6 4 3 7-8" />
    <path d="M4 21h17" />
  </Traco>
);

export const IconeFixos = () => (
  <Traco>
    <path d="M4 7h16M4 12h16M4 17h10" />
    <circle cx="17.5" cy="17" r="2.5" />
  </Traco>
);

export const IconeAjustes = () => (
  <Traco>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2L5.6 5.6" />
  </Traco>
);

export const IconeLista = () => (
  <Traco>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Traco>
);

export const IconeCalendario = () => (
  <Traco>
    <rect x="3" y="4" width="18" height="17" rx="3" />
    <path d="M3 9h18M8 3v3M16 3v3M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 17h.01M12 17h.01" />
  </Traco>
);

/** O que vem: uma seta que aponta adiante, até a parede do fim do ano. */
export const IconeAgenda = () => (
  <Traco>
    <path d="M3 12h12" />
    <path d="m11 8 4 4-4 4" />
    <path d="M20 5v14" />
  </Traco>
);

/** Totais: três barras de tamanhos diferentes, que é o desenho da tela. */
export const IconeTotais = () => (
  <Traco>
    <path d="M4 7h14M4 12h9M4 17h5" />
  </Traco>
);

/** Mais: as reticências de sempre. */
export const IconeMais = () => (
  <Traco>
    <circle cx="5" cy="12" r="1.3" />
    <circle cx="12" cy="12" r="1.3" />
    <circle cx="19" cy="12" r="1.3" />
  </Traco>
);
