# Lançar sem abrir o app

O problema não é o app estar longe. É que quinze segundos bastam para a gente
deixar para depois — e depois não anota. Com o atalho, lançar o almoço é um
toque e o valor.

Dá para disparar de três jeitos, e você escolhe depois qual prefere: um ícone na
tela de início, **dois toques na traseira do iPhone**, ou falando com a Siri.

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

**7.** Toque em **OK** / **Concluído**.

### Na primeira vez que rodar

O iPhone vai perguntar se o atalho pode enviar dados para aquele endereço. Toque
em **Permitir** — e, se oferecer, em **Sempre permitir**, para ele não perguntar
de novo toda vez.

---

## Como disparar

**Ícone na tela de início.** No atalho, toque nos três pontinhos → botão de
compartilhar → **Adicionar à Tela de Início**.

**Dois toques na traseira do iPhone.** Ajustes → **Acessibilidade** → **Toque** →
role até o fim → **Toque na parte traseira** → **Toque duplo** → escolha
**Gastei**. Este é o mais rápido de todos: você bate duas vezes atrás do
aparelho e já digita o valor.

**Siri.** Diga *"E aí Siri, Gastei"*. O nome do atalho é a frase — se você
chamou de "Gastei", é isso que você fala.

---

## Fazer mais de um

Vale ter três, para não precisar escolher o tipo toda vez. Duplique o atalho
(três pontinhos → **Duplicar**) e mude só uma coisa:

| Atalho | O que acrescentar |
|---|---|
| **Gastei** | nada — sem tipo, é gasto do dia a dia |
| **Recebi** | mais um campo no JSON: chave `tipo`, texto `entrada` |
| **Paguei conta** | mais um campo no JSON: chave `tipo`, texto `saída` |

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

**Apareceu "Faltou o valor".** O campo do JSON precisa se chamar `valor`, e o
conteúdo dele precisa ser a variável **Entrada fornecida**, não um texto fixo.

**Lançou, mas não aparece no app.** Ele aparece na próxima sincronização — abra
o app e espere um ou dois segundos. Se quiser forçar: **Ajustes → Sincronizar
agora**.

**Lancei o valor errado.** Abra o app, toque no dia, toque no lançamento e
corrija ou apague. O atalho é só uma porta de entrada; quem manda continua sendo
você.
