/** A moldura das telas de fora — entrada, fundação, primeiro acesso. */
export function MolduraDeFora({
  titulo,
  chamada,
  children,
  rodape,
}: {
  titulo: string;
  chamada: React.ReactNode;
  children: React.ReactNode;
  rodape?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-[100svh] max-w-md flex-col justify-center px-6 py-12">
      <p className="sobrescrito">Centro de Estudos Judaicos · USP</p>
      <h1 className="mt-2 font-titulo text-[30px] font-semibold leading-tight tracking-tight">
        {titulo}
      </h1>
      <p className="mt-2.5 text-[15.5px] leading-relaxed text-grafite">{chamada}</p>
      {children}
      {rodape && <div className="mt-8 text-[14px] leading-relaxed text-fosco">{rodape}</div>}
    </main>
  );
}
