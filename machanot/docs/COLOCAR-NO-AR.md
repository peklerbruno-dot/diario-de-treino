# Como colocar a plataforma no ar

Guia para quem não é programador. São uns 15 minutos, tudo em site, sem
instalar nada no computador. Precisa de duas contas gratuitas: **GitHub** (você
já tem) e **Vercel**.

Por que não dá para "só abrir": este sistema guarda dados (as machanot, os
gastos, os madrichim). Isso exige um servidor e um banco de dados. O diário de
treino é diferente — ele roda inteiro dentro do celular, por isso bastava
publicar o arquivo.

---

## Passo 1 — Juntar o código ao projeto principal

O código está numa "gaveta" separada chamada
`claude/machane-pricing-platform-7qtxqe`. Antes de publicar, ele precisa entrar
no projeto principal (`main`).

1. Abra https://github.com/peklerbruno-dot/diario-de-treino
2. Deve aparecer uma faixa amarela com o nome da gaveta e um botão
   **Compare & pull request**. Clique nele.
   (Se não aparecer: aba **Pull requests** → **New pull request** → escolha a
   gaveta na lista.)
3. Clique em **Create pull request** e depois em **Merge pull request** →
   **Confirm merge**.

Se preferir, me peça: eu abro o pull request para você e você só clica em
"Merge".

## Passo 2 — Criar o banco de dados

1. Entre em https://vercel.com e faça login **com a conta do GitHub**.
2. No menu de cima, clique em **Storage** → **Create Database** → escolha
   **Postgres** (o plano gratuito serve) → **Create**.
3. Quando terminar, abra o banco criado, vá na aba **.env.local** e clique em
   **Copy Snippet**. Guarde isso: dentro tem uma linha começando com
   `DATABASE_URL=`. É esse endereço que o app usa para achar o banco.

## Passo 3 — Publicar o app

1. Na Vercel, clique em **Add New…** → **Project**.
2. Na lista de repositórios, escolha **diario-de-treino** → **Import**.
3. **Atenção, este é o passo que mais confunde:** em *Root Directory*, clique em
   **Edit** e escolha a pasta **`machanot`**. Sem isso a Vercel publica o diário
   de treino de novo, não a plataforma.
4. Abra **Environment Variables** e cadastre três valores:

   | Nome | Valor |
   |---|---|
   | `DATABASE_URL` | o endereço que você copiou no passo 2 |
   | `AUTH_SECRET` | qualquer texto longo e aleatório (pelo menos 32 letras) |
   | `CODIGO_DE_ACESSO` | a senha combinada da coordenação |

   `CODIGO_DE_ACESSO` é a porta da plataforma: quem sabe entra. Escolha algo que
   não se adivinhe (`kaitz-2026-verao-sao-paulo` serve; `123456` não) e mande
   pelo grupo da coordenação, não por e-mail aberto.

   `AUTH_SECRET` é diferente: ninguém digita, é o sistema que usa por dentro
   para assinar quem está logado. Invente um texto comprido e esqueça.

5. Clique em **Deploy** e espere. No fim, a Vercel mostra o endereço do site —
   algo como `machanot.vercel.app`.

## Passo 4 — Entrar

1. Abra o endereço que a Vercel deu e acrescente `/login` no fim.
2. Digite o código de acesso. Pronto.

O navegador lembra por seis meses, então na prática vocês digitam isso uma vez
por temporada.

Pessoa nova na coordenação: passe o código, e acabou. Pessoa que sai: troque o
código (Vercel → **Settings** → **Environment Variables** → editar
`CODIGO_DE_ACESSO` → **Redeploy**) e mande o novo para quem fica.

## Passo 5 — Carregar a Kaitz 2026

A plataforma começa vazia. Para ela já abrir com a machané de 2026 dentro —
útil para conferir se tudo bate com a planilha —, rode a "semente" uma vez. É
outro comando de uma linha, que eu posso rodar para você depois que o banco
estiver de pé.

---

## Quanto custa

Zero, no começo. O plano gratuito da Vercel e o banco gratuito aguentam
tranquilamente o uso de uma coordenação de movimento juvenil: pouca gente, duas
semanas intensas por machané, meses parado.

## Quando alguém mexer no código

Toda vez que uma mudança entrar no `main`, a Vercel republica sozinha em um ou
dois minutos. Não precisa repetir nada disto.

---

## Se o site mostrar uma tela de erro

Primeiro: **recarregue a página**. A causa mais comum é o banco de dados
demorando para acordar depois de um tempo parado — o plano gratuito do Neon
adormece quando ninguém usa. Recarregar resolve.

Se insistir por mais de alguns minutos, olhe a aba **Deployments** do projeto
`precificacao` na Vercel. Se o deploy mais recente estiver vermelho, o site
está servindo a versão anterior e o erro veio de uma mudança que não subiu
direito; abra o log do deploy vermelho e mostre a quem cuida da parte técnica.

## Sobre pré-visualizações e o banco

Cada pull request no GitHub cria um site de pré-visualização na Vercel, e ele
usa o **mesmo banco** do site de verdade. Por isso a publicação de
pré-visualização **não aplica mudanças na estrutura do banco** — só a
publicação de produção faz isso (ver `scripts/build-vercel.mjs`).

Isso não é frescura: da primeira vez que não era assim, a pré-visualização
alterou o banco antes de o código novo estar no ar, e o site de verdade, ainda
rodando o código velho, quebrou por alguns minutos.

Se um dia vocês quiserem testar mudanças sem tocar nos dados reais, crie um
segundo banco no Neon e ligue-o só ao ambiente **Preview**.
