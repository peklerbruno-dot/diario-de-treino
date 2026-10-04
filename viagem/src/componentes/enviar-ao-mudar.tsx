"use client";

/** Um select que envia o formulário assim que muda — sem botão "Salvar". */
export function EnviarAoMudar(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
