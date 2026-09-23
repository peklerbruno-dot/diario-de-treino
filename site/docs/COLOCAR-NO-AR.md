# Como colocar o site no ar

Uns 15 minutos, tudo pelo navegador. É o mesmo caminho da plataforma de
machanot e do sistema do CEJ, que estão neste mesmo repositório.

## Passo 1 — Criar o banco de dados

1. Entre em https://vercel.com com a conta do GitHub.
2. **Storage** → **Create Database** → **Postgres** (o plano gratuito serve) →
   nome `chazit-site` → **Create**.
3. Abra o banco, aba **.env.local**, **Copy Snippet**. Guarde para o passo 2.

   **Não mande esse texto por WhatsApp nem e-mail**: ele é a chave do banco.

## Passo 2 — Publicar

1. **Add New…** → **Project** → escolha **diario-de-treino** → **Import**.
2. Em **Root Directory**, clique em **Edit** e escolha a pasta **`site`**. (Sem
   isso a Vercel publica o diário de treino.)
3. Em **Environment Variables**:
   - cole o snippet inteiro do passo 1 no campo de valor (a Vercel cria todas as
     variáveis de uma vez);
   - cadastre mais duas:

   | Nome | Valor |
   |---|---|
   | `AUTH_SECRET` | um texto longo e aleatório (32 letras ou mais). Ninguém digita. |
   | `CODIGO_DE_EDICAO` | o código que a equipe vai usar para editar. |

4. **Deploy**. No fim sai o endereço, algo como `chazit-site.vercel.app`.

## Passo 3 — Testar

Abra o endereço, vá até o rodapé → **Área da equipe**, escreva seu nome e o
código. Os botões amarelos aparecem. Comece por **Contato** (WhatsApp,
Instagram, endereço), que começa vazio.

## Trocar o código

Quando a equipe mudar: na Vercel, **Settings → Environment Variables**, troque
`CODIGO_DE_EDICAO` e faça **Redeploy**. Quem estava dentro continua até sair;
para derrubar todo mundo na hora, troque também o `AUTH_SECRET`.

## Domínio próprio (chazit.org.br, por exemplo)

Na Vercel: **Settings → Domains → Add**, e siga as instruções de DNS que ela
mostra (é preciso acesso a quem administra o domínio).
