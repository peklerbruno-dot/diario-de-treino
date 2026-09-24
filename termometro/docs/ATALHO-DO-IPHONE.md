# Lançar sem abrir o app

O problema não é o app estar longe. É que quinze segundos bastam para a gente
deixar para depois — e depois não anota. Com o atalho, lançar o almoço é um
toque e o valor.

O jeito principal é **falando com a Siri**: *"E aí Siri, Lançar gasto"*, ela pergunta
quanto, você fala o valor, e ela responde com o saldo. Também dá por dois toques
na traseira do iPhone e por um ícone na tela de início, para quando não dá para
falar.

> **Este passo a passo também está dentro do app**, em **Ajustes → Atalho do
> iPhone → Como montar o atalho**, com o endereço já preenchido e botão de
> copiar em cada palavra que precisa ser digitada sem erro. Abrir por lá é mais
> prático: você monta o atalho no mesmo aparelho em que está lendo.

> **O que isto não é.** O iPhone não deixa nenhum app ler os seus pagamentos por
> Apple Pay, nem as notificações do banco, nem o Pix que caiu. Isso é uma porta
> fechada pela Apple, igual para todo aplicativo de finanças. O atalho não
> adivinha o valor — ele só encurta a distância entre você gastar e você anotar.

---

## Antes de começar, tenha à mão

1. **O endereço do atalho.** Está no próprio app, em **Ajustes → Atalho do
   iPhone**, com um botão de copiar. É o endereço do seu site com
   `/api/lancar?valor=` no fim — e termina no sinal de igual mesmo, sem nada
   depois.
2. **O seu código de acesso**, o mesmo que você digita para entrar no app.

---

## Montar o atalho

No iPhone, abra o app **Atalhos** (vem instalado; se você apagou, está de graça
na App Store).

**1.** Na aba **Atalhos**, toque no **+** no canto superior direito. As ações se
acrescentam pela barra **Buscar**, no rodapé da tela.

**2.** Busque por **Pedir entrada** e toque nela. O cartão nasce escrito
*"Pedir **Texto** com **Texto**"* — são duas palavras iguais que fazem coisas
diferentes, e é aí que confunde.
   - Toque no **segundo** "Texto", o mais clarinho, depois da palavra *com*: é a
     pergunta. Escreva `Quanto?`
   - Toque no **primeiro**, o azul forte: é o tipo. Escolha **Número**.
   - No fim tem de estar: *"Pedir **Número** com **Quanto?**"*.

**3.** Busque por **Pedir entrada** **de novo**. Neste segundo, a pergunta é
`Qual categoria?` e o tipo fica em **Texto** — você vai falar uma palavra, não um
número.

   > Não precisa acertar o nome exato: "mercado", "conta de luz", "saude" sem
   > acento. O app acha a categoria mais parecida e diz na notificação qual
   > escolheu. Não achando nenhuma, o valor entra mesmo assim, sem categoria, e a
   > notificação avisa.

**4.** Busque por **Obter conteúdo da URL** e toque nela. Agora preencha com
cuidado:

   - No campo do endereço, **cole o endereço** que você copiou do app.
   - Ainda no mesmo campo, toque logo depois do sinal de igual e escolha a
     variável **Entrada fornecida** (é o resultado do passo 2). Ela aparece na
     barrinha de sugestões acima do teclado, e vira uma etiqueta azul.
   - Depois da etiqueta, escreva `&categoria=` e escolha a **segunda** Entrada
     fornecida — a do passo 3. Vão ficar duas etiquetas azuis.
   - No fim o campo lê: `…/api/lancar?valor=`[valor]`&categoria=`[categoria]
   - Toque na setinha **Mostrar mais** (ou no `>` ao lado do endereço) para
     abrir o resto das opções.
   - **Método**: troque de `GET` para **POST**.
   - **Cabeçalhos**: toque em **Adicionar novo cabeçalho**.
     - *Chave*: `x-codigo`
     - *Texto*: o seu código de acesso
   - **Corpo da solicitação** pode ficar em **Nenhum**.

   > O código é a única coisa que vai no cabeçalho, e não no endereço: endereço
   > fica gravado em registro de servidor e em histórico, e o código abre o
   > dinheiro inteiro. O valor não é segredo do mesmo tamanho.

**5.** Busque por **Obter valor do dicionário**. O cartão vem escrito
*"Obter **Valor** para **chave** em **Dicionário**"*.
   - Toque em *chave* e escreva `recado`.
   - O resto já vem certo: em *Dicionário* ele preenche **Conteúdo da URL**
     sozinho.

**6.** Busque por **Mostrar notificação**. O cartão vem com um texto de exemplo
— **apague esse texto** e escolha, na barrinha de sugestões, a variável **Valor
do Dicionário**.

   É isso que faz o celular avisar *"R$ 38,50 no diário. Saldo de hoje:
   R$ 1.497,43."* sem você abrir nada.

**7.** O iPhone batiza o atalho sozinho, com o nome da primeira ação — costuma
ficar *"Pedir Entrada"*. Toque nesse nome lá em cima, na setinha **⌄** ao lado,
escolha **Renomear** e chame de **Lançar gasto**. Escolha um ícone e uma cor se
quiser.

   > Este é o passo mais importante para quem vai usar a voz: **o nome é a frase
   > que a Siri escuta**. Duas palavras, e nenhuma delas um comando que o iPhone
   > já conhece — é essa a regra que faz a Siri achar. Nome de uma palavra só,
   > ainda mais sendo verbo comum ("Gastei", "Paguei", "Anotar"), ela ouve como o
   > começo de uma frase e sai procurando na internet.

**8.** Toque em **OK** / **Concluído**.

### Teste antes de chamar a Siri

É mais fácil de consertar se algo estiver torto. Toque no **▶** no rodapé do
editor e digite `1` quando ele perguntar.

Na primeira vez o iPhone pergunta se o atalho pode enviar dados para aquele
endereço. Toque em **Permitir** — e, se oferecer, em **Sempre permitir**, para
ele não perguntar de novo toda vez.

Tem de aparecer a notificação *"R$ 1,00 no diário. Saldo de hoje: ..."*. Esse
real de teste some em dois toques: no app, aba **Hoje**, toque no lançamento e
apague.

---

## Falando com a Siri

Não precisa configurar nada a mais: todo atalho já vira comando de voz sozinho,
com o próprio nome. Por isso o passo 6 — o nome — é o mais importante de todos
para quem vai usar a voz.

> — **você:** E aí Siri, Lançar gasto
> — **Siri:** Quanto?
> — **você:** trinta e nove
> — **Siri:** Qual categoria?
> — **você:** mercado
> — **Siri:** R$ 39 no diário em Mercado. Saldo de hoje: R$ 1.497.

A pergunta *"Quanto?"* é o passo 2: quando o atalho roda pela voz, a Siri fala a
pergunta e escuta a resposta. A última frase é a confirmação — ela diz o valor
que entrou e o saldo que sobrou, que é como se percebe na hora se ela ouviu
errado.

Nos iPhones mais novos basta *"Siri, Lançar gasto"*, sem o "E aí".

### Para ela entender o valor

- **Diga o número, e só ele.** As formas mais seguras são *"trinta e oito reais
  e cinquenta centavos"* e *"trinta e oito vírgula cinquenta"*; valor redondo
  pode ser só *"trinta e oito"*. Se a Siri entender alguma coisa com duas
  leituras possíveis, o app **recusa e explica**, em vez de chutar — e a
  confirmação no fim lê o valor de volta, então o erro aparece na hora. Um valor
  errado no saldo é bem pior do que uma pergunta repetida.
- **Se ela escrever o número errado**, confira o *Tipo de entrada* do passo 2:
  precisa estar em **Número**. Em **Texto** a Siri manda a frase inteira.
- **Para ela dizer o saldo em voz alta**, acrescente no fim do atalho a ação
  **Falar texto**, com a variável **Valor do dicionário** — a mesma do passo 5.
  Aí dá para lançar de mãos ocupadas. Só lembre que ela vai dizer o seu saldo em
  voz alta, onde você estiver.

## Se a Siri não achar o atalho

Ela procurou na internet, disse que não conhece, ou fez outra coisa. Antes de
mexer em qualquer ajuste, faça o teste que parte o problema no meio:

> **Segure o botão lateral** do iPhone até a Siri aparecer, e diga só o nome do
> atalho — sem "E aí Siri" na frente.

**Funcionou assim.** O atalho está certo; o que não chega é o chamado por voz.
Ajustes do iPhone → **Siri** → ligue **"Escutar 'E aí Siri'"** (ou "Ouvir 'Siri'
ou 'E aí Siri'", conforme a versão). Enquanto isso, o botão lateral já resolve.

**Também não funcionou.** O problema é o **nome**. Abra o atalho, toque no nome
lá em cima e troque para **Lançar gasto** — duas palavras, nenhuma delas um
comando que o iPhone já conhece. O nome novo vira a frase nova na hora, sem
configurar mais nada.

**Ela nem abriu.** Ajustes do iPhone → **Siri** → veja se o **Idioma** está em
**Português (Brasil)**. Com a Siri em inglês, nome em português ela não
reconhece.

Ainda assim nada? Confira se o atalho está mesmo salvo: ele tem de aparecer na
lista da aba **Atalhos**, não só na tela de edição. E, se você deu **Duplicar**,
o iPhone costuma acrescentar um "2" no fim do nome — aí a frase mudou sem você
notar.

## Sem falar, quando não dá

**Dois toques na traseira do iPhone.** Ajustes → **Acessibilidade** → **Toque** →
role até o fim → **Toque na parte traseira** → **Toque duplo** → escolha
**Lançar gasto**. Para reunião, cinema, fila.

**Ícone na tela de início.** No atalho, toque nos três pontinhos → botão de
compartilhar → **Adicionar à Tela de Início**.

Os três jeitos disparam o mesmo atalho. Ligar um não desliga os outros.

---

## Fazer mais de um

Vale ter três, para não precisar escolher o tipo toda vez. Duplique o atalho
(três pontinhos → **Duplicar**) e mude só uma coisa:

Por voz, cada um vira uma frase diferente.

Duplique o atalho, mude o nome e acrescente um pedaço ao fim do endereço,
**depois** da etiqueta azul.

| Frase | O que acrescentar no fim do endereço |
|---|---|
| *"E aí Siri, Lançar gasto"* | nada — sem tipo, é o gasto do dia a dia |
| *"E aí Siri, Lançar saída"* | `&tipo=saida` |
| *"E aí Siri, Lançar entrada"* | `&tipo=entrada` |

Outros pedaços, todos opcionais e todos no fim do endereço:

| Pedaço | Para que serve |
|---|---|
| `&tipo=` | `entrada`, `saida` ou `diario` (sem ele, é diário) |
| `&nota=` | o que era o valor — vira a nota do lançamento |
| `&data=` | `2026-09-15`, se for lançar um dia que já passou |
| `&rendaPropria=sim` | numa entrada que é dinheiro seu (salário, freela) |

E o valor aceita soma, igual ao app: mandar `195+15+83` cria três lançamentos.
O mesmo continua valendo em corpo JSON, para quem já montou o atalho assim.

---

## Se der errado

**"Não foi possível conectar" ou nada acontece.** Confira se o endereço termina
em `/api/lancar` e se o **Método** está em **POST** — o padrão é GET, e é o erro
mais comum.

**Apareceu "Código de acesso inválido".** O cabeçalho precisa se chamar
exatamente `x-codigo`, tudo minúsculo, e o texto precisa ser o mesmo código que
você digita para entrar no app.

**Apareceu "Não entendi o valor".** A Siri ouviu uma forma com mais de uma
leitura possível — "38 e 50" pode ser trinta e oito e cinquenta centavos, pode
ser dois valores. Repita dizendo *"trinta e oito reais e cinquenta centavos"*, ou
confira se o *Tipo de entrada* do passo 2 está em **Número**.

**Apareceu "Faltou o valor".** A variável **Entrada fornecida** não ficou colada
no fim do endereço. Toque no campo do endereço e confira: depois do `?valor=`
tem de haver uma etiqueta azul, e não um espaço vazio nem um número digitado à
mão.

**Lançou, mas não aparece no app.** Ele aparece na próxima sincronização — abra
o app e espere um ou dois segundos. Se quiser forçar: **Ajustes → Sincronizar
agora**.

**Lancei o valor errado.** Abra o app, toque no dia, toque no lançamento e
corrija ou apague. O atalho é só uma porta de entrada; quem manda continua sendo
você.
