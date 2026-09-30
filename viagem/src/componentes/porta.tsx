/** A moldura das telas de fora: entrar, criar conta, convite. */
export function Porta({ titulo, subtitulo, children }: { titulo: string; subtitulo?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-realce text-3xl shadow-cartao" aria-hidden>🌵</div>
        <h1 className="font-titulo text-[30px] font-bold leading-tight tracking-tight">{titulo}</h1>
        {subtitulo && <p className="mt-2 text-[16px] text-grafite">{subtitulo}</p>}
      </div>
      <div className="cartao p-5">{children}</div>
    </main>
  );
}
