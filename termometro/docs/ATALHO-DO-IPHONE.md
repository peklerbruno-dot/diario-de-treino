# Lançar sem abrir o app

O problema não é o app estar longe. É que quinze segundos bastam para a gente
deixar para depois — e depois não anota. Com o atalho, lançar o almoço é um
toque e o valor.

O jeito principal é **falando com a Siri**: *"E aí Siri, Gastei"*, ela pergunta
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
   iPhone**, com um botão de copiar. É o endereço do seu site com `/api/lancar`
   no fim.
2. **O seu código de acesso**, o mesmo que você digita para entrar no app.

---

## Montar o atalho

No iPhone, abra o app **Atalhos** (vem instalado; se você apagou, está de graça
na App Store).

**1.** Na aba **Atalhos**, toque no **+** no canto superior direito.

**2.** Toque em **Adicionar ação** e busque por **Pedir entrada**. Toque nela.
   - Em *Pergunta*, escreva `Quanto?`
   - Em *Tipo de entrada*, escolha **Número**.

**3.** Toque em **Adicionar ação** de novo e busque por **Obter conteúdo da
URL**. Toque nela. Agora preencha com cuidado:

   - No campo do endereço, **cole o endereço** que você copiou do app.
   - Toque na setinha **Mostrar mais** (ou no `>` ao lado do endereço) para
     abrir o resto das opções.
   - **Método**: troque de `GET` para **POST**.
   - **Cabeçalhos**: toque em **Adicionar novo cabeçalho**.
     - *Chave*: `x-codigo`
     - *Texto*: o seu código de acesso
   - **Corpo da solicitação**: escolha **JSON**.
   - Toque em **Adicionar novo campo** → **Texto**.
     - *Chave*: `valor`
     - No campo do valor, toque uma vez e escolha a variável **Entrada
       fornecida** (é o resultado do "Pedir entrada" do passo 2). Ela aparece na
       barrinha de sugestões acima do teclado.

**4.** (Opcional, mas vale.) Toque em **Adicionar ação** e busque por **Obter
valor do dicionário**.
   - Em *Obter*, deixe **Valor**.
   - Em *para*, escreva `recado`.
   - Em *em*, deve estar **Conteúdo da URL**.

**5.** Toque em **Adicionar ação** e busque por **Mostrar notificação**. No
corpo da notificação, escolha a variável **Valor do dicionário**.

   É isso que faz o celular avisar *"R$ 38,50 no diário. Saldo de hoje:
   R$ 1.497,43."* sem você abrir nada.

**6.** Toque no nome do atalho, lá em cima, e chame de **Gastei**. Escolha um
ícone e uma cor se quiser.

   > Este é o passo mais importante para quem vai usar a voz: **o nome é a frase
   > que a Siri escuta**. Chamou de "Gastei", você diz *"E aí Siri, Gastei"*.

**7.** Toque em **OK** / **Concluído**.

### Na primeira vez que rodar

O iPhone vai perguntar se o atalho pode enviar dados para aquele endereço. Toque
em **Permitir** — e, se oferecer, em **Sempre permitir**, para ele não perguntar
de novo toda vez.

---

## Falando com a Siri

Não precisa configurar nada a mais: todo atalho já vira comando de voz sozinho,
com o próprio nome. Por isso o passo 6 — o nome — é o mais importante de todos
para quem vai usar a voz.

> — **você:** E aí Siri, Gastei
> — **Siri:** Quanto?
> — **você:** trinta e oito e cinquenta
> — **Siri:** R$ 38,50 no diário. Saldo de hoje: R$ 1.497,43.

A pergunta *"Quanto?"* é o passo 2: quando o atalho roda pela voz, a Siri fala a
pergunta e escuta a resposta. A última frase é a confirmação — ela diz o valor
que entrou e o saldo que sobrou, que é como se percebe na hora se ela ouviu
errado.

Nos iPhones mais novos basta *"Siri, Gastei"*, sem o "E aí".

### Para ela entender o valor

- **Diga o número, e só ele.** As formas mais seguras são *"trinta e oito reais
  e cinquenta centavos"* e *"trinta e oito vírgula cinquenta"*; valor redondo
  pode ser só *"trinta e oito"*. Se a Siri entender alguma coisa com duas
  leituras possíveis, o app **recusa e explica**, em vez de chutar — e a
  confirmação no fim lê o valor de volta, então o erro aparece na hora. Um valor
  errado no saldo é bem pior do que uma pergunta repetida.
- **Se ela escrever o número errado**, confira o *Tipo de entrada* do passo 2:
  precisa estar em **Número**. Em **Texto** a Siri manda a frase inteira.
- **Se ela não achar o atalho**, dê um nome de duas palavras, como
  **Gastei agora**. Nome curto demais ela às vezes confunde com comando do
  sistema.
- **Para ela dizer o saldo em voz alta**, acrescente no fim do atalho a ação
  **Falar texto**, com a variável **Valor do dicionário** — a mesma do passo 5.
  Aí dá para lançar de mãos ocupadas. Só lembre que ela vai dizer o seu saldo em
  voz alta, onde você estiver.

## Sem falar, quando não dá

**Dois toques na traseira do iPhone.** Ajustes → **Acessibilidade** → **Toque** →
role até o fim → **Toque na parte traseira** → **Toque duplo** → escolha
**Gastei**. Para reunião, cinema, fila.

**Ícone na tela de início.** No atalho, toque nos três pontinhos → botão de
compartilhar → **Adicionar à Tela de Início**.

Os três jeitos disparam o mesmo atalho. Ligar um não desliga os outros.

---

## Fazer mais de um

Vale ter três, para não precisar escolher o tipo toda vez. Duplique o atalho
(três pontinhos → **Duplicar**) e mude só uma coisa:

Por voz, cada um vira uma frase diferente.

| Frase | O que acrescentar |
|---|---|
| *"E aí Siri, Gastei"* | nada — sem tipo, é gasto do dia a dia |
| *"E aí Siri, Recebi"* | mais um campo no JSON: chave `tipo`, texto `entrada` |
| *"E aí Siri, Paguei conta"* | mais um campo no JSON: chave `tipo`, texto `saída` |

Outros campos que o atalho pode mandar, todos opcionais:

| Chave | Para que serve |
|---|---|
| `tipo` | `entrada`, `saída` ou `diário` (sem ele, é diário) |
| `nota` | o que era o valor — vira a nota do lançamento |
| `data` | `2026-09-15`, se for lançar um dia que já passou |
| `rendaPropria` | `sim`, numa entrada que é dinheiro seu (salário, freela) |

E o valor aceita soma, igual ao app: mandar `195+15+83` cria três lançamentos.

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

**Apareceu "Faltou o valor".** O campo do JSON precisa se chamar `valor`, e o
conteúdo dele precisa ser a variável **Entrada fornecida**, não um texto fixo.

**Lançou, mas não aparece no app.** Ele aparece na próxima sincronização — abra
o app e espere um ou dois segundos. Se quiser forçar: **Ajustes → Sincronizar
agora**.

**Lancei o valor errado.** Abra o app, toque no dia, toque no lançamento e
corrija ou apague. O atalho é só uma porta de entrada; quem manda continua sendo
você.
