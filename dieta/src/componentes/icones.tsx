/** Ícones de traço, no tamanho da barra de navegação. */

type P = { className?: string };
const base = (className = "h-6 w-6") => ({
  className,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconeHoje = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="5" />
  </svg>
);

export const IconePlano = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M7 3.5h8l3.5 3.5v13.5H7z" />
    <path d="M10 10h6M10 13.5h6M10 17h4" />
  </svg>
);

export const IconeHistorico = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 20V10M9.3 20V5M14.6 20v-7M20 20V8" />
  </svg>
);

export const IconeAjustes = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);

export const IconeSino = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </svg>
);

export const IconeGota = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 3.5s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z" />
  </svg>
);

export const IconeCompartilhar = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 3.5v11M8 7.5l4-4 4 4" />
    <path d="M7 11H5.5v9.5h13V11H17" />
  </svg>
);
