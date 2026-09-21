/**
 * A fileira de pílulas que troca a situação de uma atividade ou reunião.
 *
 * **Um formulário por botão**, cada um com o valor num campo escondido. Parece
 * exagero perto de um formulário só com seis botões `name="estado"`, e foi
 * exatamente isso que eu tentei primeiro — e que falhou de um jeito que só
 * apareceu ao clicar: o `name`/`value` do botão que envia **não chega** à ação
 * de servidor. O pedido acontece, responde 200, e a ação recebe o campo vazio.
 *
 * Num campo escondido o valor viaja sempre, com ou sem JavaScript, e não depende
 * de o navegador e o React concordarem sobre quem enviou o formulário.
 */
export function BotoesDeEstado<T extends string>({
  acao,
  id,
  atual,
  opcoes,
  nomes,
}: {
  acao: (dados: FormData) => void | Promise<void>;
  id: string;
  atual: T;
  opcoes: readonly T[];
  nomes: Record<T, string>;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {opcoes.map((opcao) => {
        const aqui = opcao === atual;
        return (
          <form action={acao} key={opcao}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="estado" value={opcao} />
            <button
              type="submit"
              aria-current={aqui ? "true" : undefined}
              className={`rounded-pilula px-3 py-1.5 text-[13px] ${
                aqui
                  ? "bg-heroi font-semibold text-heroi-tinta"
                  : "bg-papel text-grafite hover:bg-linha"
              }`}
            >
              {nomes[opcao]}
            </button>
          </form>
        );
      })}
    </div>
  );
}
