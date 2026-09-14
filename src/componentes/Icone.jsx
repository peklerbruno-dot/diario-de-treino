// Ícones de linha da navegação inferior e da lixeira — iguais aos do protótipo.
const ICO = {
  hoje: <path d="M3 12l9-8 9 8M5 10v10h14V10M10 20v-6h4v6" />,
  treinos: <path d="M2 10h3v4H2zM19 10h3v4h-3zM5 8h3v8H5zM16 8h3v8h-3zM8 12h8" />,
  biblioteca: <path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z" />,
  historico: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
  exportar: <path d="M12 15V4M7 9l5-5 5 5M4 15v5h16v-5" />,
};
export const Icone = ({ k }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICO[k]}</svg>;
export const Lixo = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
