# Como colocar o Termômetro no ar

Guia para quem não programa. São uns 15 minutos, tudo em site, sem instalar nada
no computador. Precisa de duas contas gratuitas: **GitHub** (você já tem) e
**Vercel** (você já usou para o machanot).

Por que não dá para "só abrir um arquivo": este app guarda dinheiro e precisa
mostrar os mesmos números no iPhone e no computador. Isso exige um servidor e um
banco de dados — é o mesmo caminho da plataforma de machanot, e não o do diário
de treino, que roda inteiro dentro do celular.

---

## Passo 1 — Juntar o código ao projeto principal

O código está numa "gaveta" chamada `claude/practical-curie-55zjag`. Antes de
publicar, ele precisa entrar no projeto principal (`main`).

1. Abra https://github.com/peklerbruno-dot/diario-de-treino
2. Deve aparecer uma faixa amarela com o nome da gaveta e um botão
   **Compare & pull request**. Clique nele.
   (Se não aparecer: aba **Pull requests** → **New pull request** → escolha a
   gaveta na lista.)
3. Clique em **Create pull request** e depois em **Merge pull request** →
   **Confirm merge**.

Se preferir, me peça: eu abro o pull request e você só clica em "Merge".

## Passo 2 — Criar o banco de dados

O Termômetro precisa do banco **dele**, separado do machanot. São dois apps
diferentes; um não deve poder mexer nos dados do outro.

1. Entre em https://vercel.com com a conta do GitHub.
2. No menu de cima: **Storage** → **Create Database** → **Postgres** (o plano
   gratuito serve) → dê o nome `termometro` → **Create**.
3. Abra o banco criado, vá na aba **.env.local** e clique em **Copy Snippet**.
   Dentro tem uma linha começando com `DATABASE_URL=`. É o endereço que o app
   usa para achar o banco. Guarde.

## Passo 3 — Publicar o app

1. Na Vercel: **Add New…** → **Project**.
2. Na lista de repositórios, escolha **diario-de-treino** → **Import**.
3. **Este é o passo que mais confunde:** em *Root Directory*, clique em **Edit**
   e escolha a pasta **`termometro`**. Sem isso a Vercel publica o diário de
   treino de novo, não o Termômetro.
4. Abra **Environment Variables** e cadastre três valores:

   | Nome | Valor |
   |---|---|
   | `DATABASE_URL` | o endereço que você copiou no passo 2 |
   | `AUTH_SECRET` | qualquer texto longo e aleatório (pelo menos 32 letras) |
   | `CODIGO_DE_ACESSO` | a senha que você vai digitar para entrar |

   `CODIGO_DE_ACESSO` é a porta do app, e aqui é o seu dinheiro atrás dela.
   Escolha algo que não se adivinhe e que você consiga digitar no celular.

   `AUTH_SECRET` é diferente: ninguém digita, é o sistema que usa por dentro
   para assinar quem está logado. Invente um texto comprido e esqueça.

5. Clique em **Deploy** e espere. No fim sai o endereço, algo como
   `termometro.vercel.app`.

## Passo 4 — Instalar no iPhone

1. Abra o endereço no **Safari** (não funciona pelo Chrome no iOS).
2. Digite o código de acesso. O aparelho lembra por seis meses.
3. Toque em **Compartilhar** → **Adicionar à Tela de Início**.

Pronto: o Termômetro vira um ícone na tela, abre em janela própria, sem barra de
endereço, e funciona sem internet. No computador é o mesmo endereço, aberto no
navegador — e os dois mostram sempre a mesma coisa.

## Passo 5 — Trazer a planilha

Só uma vez, e de preferência **no computador**, que é onde o arquivo está.

1. Abra o endereço do app no navegador e entre.
2. **Ajustes** → **Importar planilha** → escolha o arquivo `.xlsx`.
3. O app mostra o que entendeu, mês a mês, antes de gravar nada: quantos
   lançamentos achou, com que saldo o ano começa, e o que ele ajustou (por
   exemplo, o dinheiro que estava num dia 31 de novembro).
4. Confira e clique em **Trazer para o app**.

Em poucos segundos aparece tudo no iPhone também.

> O arquivo não sai do seu computador: a leitura acontece dentro do navegador. O
> que vai para o banco são os lançamentos, nunca a planilha.

Se algum dia quiser importar de novo (uma versão mais nova do arquivo, por
exemplo), o app avisa que já existem lançamentos naquele ano e oferece apagar os
antigos antes — senão tudo contaria duas vezes.

## Passo 6 — Cadastrar os fixos

É o que faz o app prever o futuro, como a planilha fazia quando você já deixava
outubro, novembro e dezembro preenchidos.

Em **Fixos** → **Novo**, cadastre o que se repete todo mês: o salário, o
aluguel, a fatura, a parcela, o investimento, e o gasto de todo dia (esse com
"Todo dia" no lugar do dia do mês). Depois toque em **Preencher previsão até
dezembro**.

---

## O dia a dia

- **Gastou alguma coisa?** Abra o app, toque em **Lançar**, digite o valor e
  pronto. Ele já vem no dia de hoje e na coluna "Diário", que é o caso de quase
  sempre. Nota é opcional.
- **Foram três compras?** Digite `195+15+83` no valor. Viram três lançamentos.
- **Quer ver um dia específico?** Toque na linha dele na lista do mês.
- **Um valor previsto aconteceu?** Abra o dia e toque em **Aconteceu**. Se veio
  diferente, toque no valor e corrija.
- **Quer saber se dá até o fim do mês?** É a primeira coisa na tela: o saldo de
  hoje e, logo abaixo, onde ele chega no fim do mês. Se for ficar negativo, o
  app diz em que dia.

## Perguntas que costumam aparecer

**Perdi o celular. Perdi os dados?**
Não. Tudo está no banco, no servidor. Entre pelo computador, ou pelo celular
novo com o mesmo código, e está lá.

**Usei o app no avião, sem internet. Some?**
Não. O que você lança fica guardado no aparelho e sobe sozinho quando a internet
volta — mesmo que você feche o app antes disso. Enquanto isso o app mostra um
aviso de que ainda tem coisa para enviar.

**Quero o arquivo de volta.**
**Ajustes → Levar os dados embora**: sai uma planilha CSV (abre no Excel e no
Numbers, com vírgula decimal) e um backup completo em JSON. A qualquer momento,
sem pedir para ninguém.

**Quero trocar o código de acesso.**
Vercel → seu projeto → **Settings** → **Environment Variables** → edite
`CODIGO_DE_ACESSO` → depois **Deployments** → nos três pontinhos do último,
**Redeploy**.

**O app não abre e pede o código de novo.**
O cookie vale seis meses; passado esse tempo, é só digitar outra vez. Se pedir
antes disso, provavelmente o Safari limpou os dados do site — os lançamentos
continuam no servidor, e voltam assim que você entrar.

**Apareceu "Não consegui sincronizar agora".**
Normalmente é internet ruim, e ele tenta de novo sozinho. O que você escreveu
não se perde: fica na fila. Se insistir por muito tempo, confira em **Ajustes →
Sincronização** o que ele está dizendo.
