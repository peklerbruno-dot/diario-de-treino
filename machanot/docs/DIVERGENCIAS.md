# Divergências entre a planilha de 2026 e o modelo da plataforma

A planilha original tinha irregularidades que o modelo não reproduz de propósito.
Este arquivo registra cada uma, para que ninguém olhe a tabela antiga em seis
meses e ache que a plataforma está errada.

## 1. Desconto de 2º filho: a planilha usava três valores diferentes

A política declarada era "−R$ 130 para o segundo filho". Na prática a planilha
descontava:

| Célula | Desconto praticado | Preço divulgado |
|---|---|---|
| grandes, 2º filho **sócio** | −R$ 130 | R$ 2.317,49 |
| grandes, 2º filho **não-sócio** | −R$ 70 | R$ 2.577,49 |
| pequenos, 2º filho sócio | −R$ 100 | R$ 1.798,22 |
| pequenos, 2º filho não-sócio | −R$ 100 | R$ 1.998,22 |

Três descontos distintos para a mesma regra comercial. É arredondamento manual
acumulado, não decisão de preço.

**O que a plataforma faz.** O desconto é regular dentro de cada turma: a mesma
subtração vale para sócio e não-sócio. Com isso:

- O modelo com um desconto único de R$ 130 (o da §7) dá **R$ 1.768,22** e
  **R$ 1.968,22** nos pequenos, em vez de R$ 1.798,22 e R$ 1.998,22.
- A diferença entre sócio e não-sócio do 2º filho dos grandes passa a ser os
  mesmos R$ 200 de todas as outras linhas: **R$ 2.517,49**, não R$ 2.577,49.

**Extensão criada para não perder a tabela histórica.** `PoliticaPreco` ganhou
`descontoSegundoFilhoGrandesCents` e `descontoSegundoFilhoPequenosCents`
(e os equivalentes em percentual). Quando estão vazios, valem o desconto único —
o comportamento da §7 continua sendo o padrão. Preenchendo R$ 130 nos grandes e
R$ 100 nos pequenos, a grade dos pequenos volta a ser exatamente a divulgada.

A irregularidade que **não** é reproduzível é a dos R$ 70 na linha de não-sócio
dos grandes: descontar valores diferentes de sócio e não-sócio quebraria a
regularidade da grade, que é justamente o defeito que a plataforma corrige. O
teste `grandes seguem o desconto único de R$ 130` fixa esse comportamento.

Os dois testes ficam em `src/lib/calculo.test.ts`:

- `Machané Kaitz 2026 — reprodução da planilha` — modelo regular, desconto único.
- `Grade divulgada de 2026 (desconto de 2º filho por turma)` — reproduz a tabela
  divulgada nos pequenos.

## 2. Peso de rateio digitado à mão (0,89 / 0,11)

O coeficiente não era arbitrário: é a participação de cada turma no total de
pessoa-dia. O valor matemático de 2026 é **89,6341%**, arredondado à mão para
89%. O arredondamento desloca **R$ 1.664,33** dos pequenos para os grandes —
R$ 97,90 a mais no bolso de cada baby, R$ 16,98 a menos em cada chanich grande.

A plataforma calcula o peso. O override continua possível (é decisão política
legítima), mas exige justificativa e mostra o deslocamento em reais antes de
salvar.

## 3. Diárias de equipe e segurança contadas duas vezes

Na planilha, a hospedagem da enfermeira, da psicóloga, do mechanech, dos
shagririm e dos seguranças estava em linhas de gasto fixo, não no bloco de
hospedagem. Quem migrar esses dados e marcar "gera hospedagem" nas categorias
correspondentes conta a diária duas vezes.

A flag `Categoria.geraHospedagem` separa os dois modelos, e o detector de
`avisosDuplaContagem` avisa quando os dois aparecem juntos. O cadastro histórico
de 2026 usa `geraHospedagem: false` para equipe e segurança — é o que reproduz a
planilha ao centavo.

## 4. `SUM` começando na linha errada

Três abas somavam um intervalo de linhas que não incluía os últimos itens,
escondendo até R$ 3.144. Aqui a soma percorre a coleção inteira; o teste
`soma a coleção inteira, inclusive a última linha` existe só para travar isso.

## 5. CPF e RG dos madrichim

A planilha coletava os dois. O schema desta plataforma não tem esses campos e
não deve ganhar. Identificação por nome + telefone + kvutzá. Ver §11 do
briefing e `docs/LGPD.md`.
