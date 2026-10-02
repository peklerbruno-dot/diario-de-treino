# Como colocar o Dieta no ar

Guia para quem não programa. São uns 20 minutos, tudo em site, sem instalar
nada no computador. Usa as mesmas contas gratuitas do Termômetro: **GitHub**,
**Vercel** e mais duas — **Google AI Studio** (para ler o PDF) e
**cron-job.org** (o relógio dos avisos).

Precisa de iPhone com **iOS 16.4 ou mais novo** para receber as notificações.

---

## Passo 1 — Criar o banco de dados

1. Entre em https://vercel.com com a conta do GitHub.
2. **Storage** → **Create Database** → **Neon (Postgres)**, plano gratuito → nome
   `dieta` → **Create**.
3. Abra o banco, aba **.env.local** → **Copy Snippet**. Guarde para o passo 3 e
   não mande esse texto para ninguém: é a chave do banco.

## Passo 2 — Pegar a chave do Gemini (leitura do PDF)

1. Entre em https://aistudio.google.com/apikey com uma conta Google.
2. **Create API key** → copie a chave. É grátis.

Sem ela o app funciona, mas o plano tem de ser cadastrado à mão.

## Passo 3 — Publicar o app

1. Na Vercel: **Add New…** → **Project** → repositório **diario-de-treino** →
   **Import**.
2. **O passo que mais confunde:** em *Root Directory*, clique em **Edit** e
   escolha a pasta **`dieta`**.
3. Em **Environment Variables**:
   - cole o **snippet inteiro** do passo 1 no campo de valor (a Vercel cria todas
     as variáveis de uma vez — uma delas, a `DATABASE_URL_UNPOOLED`, é a que
     cria as tabelas);
   - cadastre mais estas, uma a uma:

   | Nome | Valor |
   |---|---|
   | `AUTH_SECRET` | um texto longo e aleatório (32 letras ou mais) |
   | `CODIGO_DE_ACESSO` | a senha que você vai digitar para entrar |
   | `CRON_SECRET` | outro texto aleatório, só letras e números (vai num endereço) |
   | `GEMINI_API_KEY` | a chave do passo 2 |
   | `VAPID_SUBJECT` | `mailto:` e o seu e-mail, ex.: `mailto:voce@gmail.com` |

4. **Deploy**. No fim sai o endereço, algo como `dieta-xyz.vercel.app`.

## Passo 4 — As chaves das notificações

1. Abra o endereço, entre com o código e vá em **Ajustes**.
2. Aparece um quadro "Falta configurar na Vercel" com **duas chaves já geradas**:
   `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`. Copie cada uma (botão **Copiar**) e
   cadastre na Vercel: projeto → **Settings** → **Environment Variables**.
3. **Deployments** → no último, **⋯** → **Redeploy**.

Cadastre o par uma vez e não troque mais: chaves novas desligam os avisos de
todo aparelho já ativado.

## Passo 5 — O relógio dos avisos

Quem faz o app "olhar o relógio" a cada minuto é o cron-job.org.

1. Crie conta em https://cron-job.org (grátis).
2. **Create cronjob**:
   - **URL**: `https://SEU-ENDERECO.vercel.app/api/avisos?chave=SEU_CRON_SECRET`
   - **Execution schedule**: *Every minute*.
   - **Save**.
3. Para conferir: abra essa URL no navegador. Deve aparecer um texto começando
   com `{"agora":…`. Se aparecer "Não autorizado", a chave não bate com o
   `CRON_SECRET`.

## Passo 6 — Instalar no iPhone e ligar os avisos

1. Abra o endereço no **Safari** → **Compartilhar** → **Adicionar à Tela de
   Início**.
2. Abra o app **pelo ícone** (não pelo Safari) e entre com o código.
3. Na tela Hoje, toque em **Ativar avisos** → **Permitir**.
4. Em **Ajustes** → **Mandar um aviso de teste**. Chegou? Pronto.

Se recusou sem querer: Ajustes do iPhone → **Notificações** → **Dieta** →
Permitir.

## Passo 7 — Colocar a dieta

**Plano** → **Plano novo** → **Escolher PDF ou fotos** → **Ler o plano**.
Confira cada refeição com o PDF do lado, corrija o que precisar e **Salvar**.

---

## Quando algo não funciona

- **O aviso de teste chega, mas os das refeições não.** É o relógio: confira o
  passo 5 (no cron-job.org, o histórico do job mostra se as chamadas estão dando
  200).
- **"Ativar avisos" não aparece, aparece "Instale o app".** O app foi aberto
  pelo Safari, não pelo ícone da Tela de Início.
- **A leitura do PDF diz que o arquivo é grande demais.** O limite é 4 MB. Mande
  fotos das páginas (o app reduz as fotos sozinho) em vez do PDF.
- **A cota do Gemini acabou.** O plano gratuito tem limite por minuto; espere um
  pouco e tente de novo.
