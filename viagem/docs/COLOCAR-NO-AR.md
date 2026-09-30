# Como colocar o app da viagem no ar

Uns 20 minutos, tudo pelo navegador. Precisa de: **GitHub** (já tem),
**Vercel** (a mesma dos outros apps) e uma conta **Google** para a chave do
Gemini.

---

## Passo 1 — Criar o banco

1. https://vercel.com → **Storage** → **Create Database** → **Postgres** (Neon,
   plano gratuito) → nome `viagem` → **Create**.
2. No banco criado, aba **.env.local** → **Copy Snippet**. Guarde para o passo 3.
   **Não mande esse texto por WhatsApp**: é a chave do banco.

## Passo 2 — Pegar a chave do Gemini (lê os posts e prints)

1. https://aistudio.google.com/apikey → **Create API key**.
2. Copie a chave (começa com `AIza…`). É gratuita; não precisa de cartão.

## Passo 3 — Publicar

1. Na Vercel: **Add New…** → **Project** → repositório **diario-de-treino** →
   **Import**.
2. Em **Root Directory**, clique em **Edit** e escolha a pasta **`viagem`**.
   Sem isso a Vercel publica o diário de treino.
3. Em **Environment Variables**:
   - cole **o snippet inteiro** do passo 1 no campo de valor (a Vercel cria todas
     as variáveis de uma vez, inclusive a `DATABASE_URL_UNPOOLED`, que cria as
     tabelas);
   - e cadastre, uma a uma:

   | Nome | Valor |
   |---|---|
   | `AUTH_SECRET` | um texto aleatório de pelo menos 32 letras (ninguém digita nunca) |
   | `CODIGO_DE_FUNDACAO` | uma senha sua, para criar a primeira conta |
   | `GEMINI_API_KEY` | a chave do passo 2 |
   | `GOOGLE_MAPS_API_KEY` | *opcional* — ver “Busca do Google” abaixo |

4. **Deploy**. Em um ou dois minutos sai a URL `https://<nome>.vercel.app`.

## Passo 4 — Criar a viagem e chamar o grupo

1. Abra a URL → **Crie sua conta** → digite o `CODIGO_DE_FUNDACAO`, seu nome,
   e-mail e senha.
2. Preencha a viagem: nome, datas, moeda das contas (real), quem mais vai e as
   pastas (“Cidade do México, Oaxaca, Puerto Escondido”).
3. Na tela **Grupo**, toque em **Compartilhar convite** e mande no grupo do
   WhatsApp. Cada um cria a conta pelo link e escolhe o próprio nome.

**Instalar no celular:** no iPhone, abra no **Safari** → Compartilhar →
**Adicionar à Tela de Início**. No Android, Chrome → menu → **Instalar app**.

---

## Atalho do iPhone

Para mandar um reel direto do Instagram, sem copiar link. Cada pessoa faz o
seu (o endereço tem uma chave pessoal):

1. No app, tela **Grupo** → *Mandar posts direto do Instagram* → **Copiar** o
   endereço.
2. App **Atalhos** → **+** → renomeie para **Mandar pra Viagem**.
3. Toque em ⓘ (detalhes) → ligue **Mostrar na Folha de Compartilhamento** →
   em tipos aceitos, deixe **URLs**, **Texto** e **Imagens**.
4. Adicione a ação **Obter Conteúdo de URL**:
   - URL: cole o endereço copiado;
   - Método: **POST**;
   - Corpo da Solicitação: **Formulário** → adicione um campo **Texto** chamado
     `conteudo` com o valor **Entrada do Atalho**.
     (Para mandar prints, adicione outro campo do tipo **Arquivo** com a mesma
     Entrada do Atalho.)
5. *(Opcional, recomendado para prints)* antes dela, **Redimensionar Imagem**
   para largura 1400 — print cheio de iPhone é pesado.
6. *(Opcional)* depois dela, **Mostrar Notificação** com o **Conteúdo de URL**:
   aparece “✓ 8 lugares na caixa de entrada”.

Uso: no Instagram, **Compartilhar → Mandar pra Viagem**. Depois é só abrir o
app e confirmar na caixa de entrada.

---

## Busca do Google (opcional)

Sem `GOOGLE_MAPS_API_KEY` a busca de lugares usa o OpenStreetMap, de graça.
Com ela, acha muito mais restaurante pequeno. Para criar:

1. https://console.cloud.google.com → crie um projeto → **APIs e serviços** →
   ative **Places API (New)**.
2. **Credenciais** → **Criar credenciais** → **Chave de API**. Restrinja a chave
   à *Places API (New)*.
3. O Google pede um cartão para liberar a cota gratuita mensal; uma viagem de
   amigos fica muito abaixo dela. Para ter certeza, em **Cotas** limite a
   *Text Search* a umas 100 por dia.
4. Cadastre como `GOOGLE_MAPS_API_KEY` na Vercel e faça **Redeploy**.

## Quando algo dá errado

- **“A leitura automática está desligada”** — falta `GEMINI_API_KEY` (ou foi
  cadastrada depois do deploy: faça **Redeploy**).
- **“A cota gratuita do Gemini acabou por agora”** — espere uns minutos; o
  limite é por minuto e por dia.
- **O Instagram não deixou ler** — mande os prints dos slides.
- **Esqueci a senha** — não há recuperação por e-mail. Quem organiza abre
  **Grupo** → o nome da pessoa → **Mudar** → **Soltar a conta**, e manda o
  convite de novo: ela cria outra conta, escolhe o próprio nome e continua com
  todas as contas dela.
- **Deploy falhou com P1001** — o banco não foi alcançado: confira se o snippet
  inteiro foi colado. **P3009** — há uma migração marcada como falha no banco.
