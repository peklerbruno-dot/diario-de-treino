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
4. Abra **Environment Variables** e cadastre quatro valores:

   | Nome | Valor |
   |---|---|
   | `DATABASE_URL` | o endereço que você copiou no passo 2 |
   | `AUTH_SECRET` | qualquer texto longo e aleatório (pelo menos 32 letras) |
   | `EMAILS_AUTORIZADOS` | os e-mails que podem entrar, separados por vírgula |
   | `CODIGO_DE_ACESSO` | a senha combinada da coordenação (mínimo 12 letras) |

   `EMAILS_AUTORIZADOS` é a porta da plataforma: só quem estiver nessa lista
   consegue entrar. Comece pelo seu e depois acrescente o resto da coordenação,
   assim: `voce@email.com,fulano@email.com,ciclana@email.com`

   `CODIGO_DE_ACESSO` é a senha que vocês combinam entre si. Para entrar, a
   pessoa precisa das duas coisas: estar na lista de e-mails **e** saber o
   código. Escolha algo que não se adivinhe (`kaitz-2026-verao-sao-paulo` serve;
   `123456` não) e mande pelo grupo da coordenação, não por e-mail aberto.

   `AUTH_SECRET` é diferente: ninguém digita, é o sistema que usa por dentro
   para assinar quem está logado. Invente um texto comprido e esqueça.

5. Clique em **Deploy** e espere. No fim, a Vercel mostra o endereço do site —
   algo como `machanot.vercel.app`.

## Passo 4 — Entrar

1. Abra o endereço que a Vercel deu e acrescente `/login` no fim.
2. Digite o seu e-mail e o código de acesso. Pronto.

Cada pessoa nova da coordenação: acrescente o e-mail dela em
`EMAILS_AUTORIZADOS` (na Vercel, em **Settings** → **Environment Variables**,
depois **Redeploy**) e passe o código. Ninguém depende de programador para isso.

Quando alguém sair do movimento, tire o e-mail da lista — e, se for alguém que
sabia o código, troque o código.

### E o link por e-mail?

A entrada por link mágico (sem senha) já está pronta no código, mas o envio de
e-mail depende de contratar um serviço de envio. Enquanto isso não acontece, o
código de acesso é o caminho. Quando quiser ligar o e-mail, é um arquivo só:
`src/lib/email.ts`.

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
