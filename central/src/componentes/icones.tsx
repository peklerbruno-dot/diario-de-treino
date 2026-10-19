/** Ícones de traço, desenhados à mão no mesmo estilo: 20×20, traço 1,6. */
type P = { className?: string };
const base = (d: React.ReactNode, className = "h-[18px] w-[18px]") => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    {d}
  </svg>
);
export const IconeHoje = ({ className }: P) => base(<><circle cx="10" cy="10" r="3.2" /><path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3 6 14M14 6l1.3-1.3" /></>, className);
export const IconeAgenda = ({ className }: P) => base(<><rect x="3" y="4" width="14" height="13" rx="2" /><path d="M3 8h14M7 2.5v3M13 2.5v3" /></>, className);
export const IconeTarefas = ({ className }: P) => base(<><rect x="3" y="3" width="14" height="14" rx="3.5" /><path d="m7 10 2 2 4-4" /></>, className);
export const IconeEmails = ({ className }: P) => base(<><rect x="2.5" y="4.5" width="15" height="11" rx="2" /><path d="m3 5.5 7 5 7-5" /></>, className);
export const IconeAjustes = ({ className }: P) => base(<><path d="M3 6h8M15 6h2M3 14h2M9 14h8" /><circle cx="13" cy="6" r="2" /><circle cx="7" cy="14" r="2" /></>, className);
export const IconeSeta = ({ className }: P) => base(<path d="m8 5 5 5-5 5" />, className);
export const IconeVoltar = ({ className }: P) => base(<path d="m12 5-5 5 5 5" />, className);
export const IconeExterno = ({ className = "h-3.5 w-3.5" }: P) => base(<path d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3M11 3h6v6M17 3l-8 8" />, className);
export const IconeClipe = ({ className = "h-4 w-4" }: P) => base(<path d="m15.5 9.5-5.8 5.8a3.5 3.5 0 0 1-5-5l6.4-6.3a2.3 2.3 0 0 1 3.3 3.3l-6.3 6.4a1.2 1.2 0 0 1-1.7-1.7l5.8-5.8" />, className);
