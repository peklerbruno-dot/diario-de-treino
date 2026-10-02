# Lançar sem clicar em nada (quase)

`scripts/lancar.mjs` faz sozinho tudo o que o [`COLOCAR-NO-AR.md`](COLOCAR-NO-AR.md)
manda fazer à mão:

- cria o banco no Neon;
- cria o projeto na Vercel apontando para a pasta `dieta`;
- cadastra todas as variáveis. O código de acesso, os segredos e as chaves das notificações são sorteados pelo script;
- publica a `main`;
- liga o relógio dos avisos no cron-job.org.

Ele precisa destas chaves, que só o dono das contas consegue gerar:

| Variável | Onde pegar |
|---|---|
| `VERCEL_TOKEN` | https://vercel.com/account/tokens → **Create** |
| `NEON_API_KEY` | https://console.neon.tech → **Account settings → API keys → Create** |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey → **Create API key** (opcional: sem ela, o plano é cadastrado à mão) |
| `CRONJOB_API_KEY` | https://console.cron-job.org → **Settings → API → Create API key** (opcional: sem ela, o passo 5 do guia é à mão) |

As três primeiras são as mesmas do app da viagem. Se elas já estão no ambiente,
só falta a do cron-job.org.

**Nunca cole essas chaves num chat.** No Claude Code na web, elas vão nas
configurações do ambiente (menu do ambiente no título da sessão → **Editar** →
variáveis de ambiente). Numa sessão nova, é só pedir “lança o app da dieta”,
ou rodar:

```sh
cd dieta && npm install
node scripts/lancar.mjs --conferir   # só testa as chaves
node scripts/lancar.mjs              # cria tudo e publica
```

No fim ele mostra o endereço do app e o código de acesso. Depois, no iPhone,
siga o passo 6 do guia: instalar na Tela de Início e tocar em **Ativar avisos**.
