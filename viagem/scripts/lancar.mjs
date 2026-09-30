/**
 * Coloca o app no ar sozinho: cria o banco no Neon, o projeto na Vercel (pasta
 * `viagem`, ligado ao repositório), cadastra as variáveis e publica a `main`.
 *
 *   VERCEL_TOKEN=… NEON_API_KEY=… GEMINI_API_KEY=… node viagem/scripts/lancar.mjs
 *
 * Pode rodar de novo sem medo: reaproveita o banco e o projeto que já existirem
 * com o mesmo nome, e só acrescenta ou atualiza as variáveis. `AUTH_SECRET` e
 * `CODIGO_DE_FUNDACAO` só são sorteados na primeira vez.
 *
 * Com `--conferir`, só testa se as três chaves funcionam, sem criar nada.
 */
import { randomBytes } from "node:crypto";

const NOME = process.env.VIAGEM_PROJETO || "viagem-mexico";
const REPO = { org: "peklerbruno-dot", repo: "diario-de-treino" };
const REGIAO_NEON = "aws-us-east-1"; // perto de onde a Vercel roda as funções (iad1)

const { VERCEL_TOKEN, NEON_API_KEY, GEMINI_API_KEY, VERCEL_TEAM_ID } = process.env;
const conferir = process.argv.includes("--conferir");

function parar(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}
for (const [nome, valor] of Object.entries({ VERCEL_TOKEN, NEON_API_KEY, GEMINI_API_KEY })) {
  if (!valor) parar(`Falta a variável ${nome}. Veja viagem/docs/LANCAR.md.`);
}

async function api(base, token, caminho, { metodo = "GET", corpo, time = false } = {}) {
  const url = new URL(base + caminho);
  if (time && VERCEL_TEAM_ID) url.searchParams.set("teamId", VERCEL_TEAM_ID);
  const r = await fetch(url, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await r.text();
  let json;
  try {
    json = texto ? JSON.parse(texto) : {};
  } catch {
    json = { bruto: texto };
  }
  return { ok: r.ok, status: r.status, json };
}
const vercel = (caminho, opcoes = {}) => api("https://api.vercel.com", VERCEL_TOKEN, caminho, { ...opcoes, time: true });
const neon = (caminho, opcoes) => api("https://console.neon.tech/api/v2", NEON_API_KEY, caminho, opcoes);

// ---------------------------------------------------------------------------
// 0. As chaves funcionam?
// ---------------------------------------------------------------------------
console.log("→ Conferindo as chaves…");
const eu = await vercel("/v2/user");
if (!eu.ok) parar(`A Vercel recusou o VERCEL_TOKEN (${eu.status}): ${JSON.stringify(eu.json).slice(0, 200)}`);
const projetosNeon = await neon("/projects");
if (!projetosNeon.ok) parar(`O Neon recusou a NEON_API_KEY (${projetosNeon.status}): ${JSON.stringify(projetosNeon.json).slice(0, 200)}`);
const gemini = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
if (!gemini.ok) parar(`O Google recusou a GEMINI_API_KEY (${gemini.status}).`);
console.log(`  ✓ Vercel (${eu.json.user?.username}), Neon e Gemini respondendo.`);
if (conferir) process.exit(0);

// ---------------------------------------------------------------------------
// 1. Banco no Neon
// ---------------------------------------------------------------------------
console.log("→ Banco de dados (Neon)…");
let projeto = projetosNeon.json.projects?.find((p) => p.name === NOME);
let senhaDoBanco;
let conexao;
if (!projeto) {
  const r = await neon("/projects", { metodo: "POST", corpo: { project: { name: NOME, pg_version: 16, region_id: REGIAO_NEON } } });
  if (!r.ok) parar(`Não consegui criar o banco: ${JSON.stringify(r.json).slice(0, 300)}`);
  projeto = r.json.project;
  conexao = r.json.connection_uris?.[0]?.connection_parameters;
  console.log(`  ✓ Criado: ${projeto.id}`);
} else {
  console.log(`  ✓ Já existia: ${projeto.id}`);
}
if (!conexao) {
  // Projeto que já existia: pede a conexão ao Neon.
  const branches = await neon(`/projects/${projeto.id}/branches`);
  const principal = branches.json.branches?.find((b) => b.default) ?? branches.json.branches?.[0];
  const bancos = await neon(`/projects/${projeto.id}/branches/${principal.id}/databases`);
  const banco = bancos.json.databases?.[0];
  const senha = await neon(`/projects/${projeto.id}/branches/${principal.id}/roles/${banco.owner_name}/reveal_password`);
  const ep = await neon(`/projects/${projeto.id}/endpoints`);
  const host = ep.json.endpoints?.find((e) => e.type === "read_write")?.host;
  conexao = { database: banco.name, role: banco.owner_name, password: senha.json.password, host, pooler_host: host?.replace(/^([^.]+)/, "$1-pooler") };
}
senhaDoBanco = conexao.password;
const url = (host) =>
  `postgresql://${encodeURIComponent(conexao.role)}:${encodeURIComponent(senhaDoBanco)}@${host}/${conexao.database}?sslmode=require`;
// Pela conexão com intermediário (pgbouncer), o Prisma precisa saber que ele está ali.
const DATABASE_URL = `${url(conexao.pooler_host)}&pgbouncer=true`;
const DATABASE_URL_UNPOOLED = url(conexao.host);

// ---------------------------------------------------------------------------
// 2. Projeto na Vercel
// ---------------------------------------------------------------------------
console.log("→ Projeto na Vercel…");
let proj = await vercel(`/v9/projects/${NOME}`);
if (proj.status === 404) {
  proj = await vercel("/v11/projects", {
    metodo: "POST",
    corpo: {
      name: NOME,
      framework: "nextjs",
      rootDirectory: "viagem",
      gitRepository: { type: "github", repo: `${REPO.org}/${REPO.repo}` },
    },
  });
  if (!proj.ok) {
    parar(
      `Não consegui criar o projeto (${proj.status}): ${JSON.stringify(proj.json).slice(0, 300)}\n` +
        "  Se o erro fala de GitHub, a Vercel precisa ter acesso ao repositório (é o mesmo acesso dos outros apps).",
    );
  }
  console.log(`  ✓ Criado: ${NOME}`);
} else if (proj.ok) {
  console.log(`  ✓ Já existia: ${NOME}`);
} else {
  parar(`A Vercel respondeu ${proj.status}: ${JSON.stringify(proj.json).slice(0, 300)}`);
}
const projetoId = proj.json.id;

// As variáveis. Segredos sorteados só na primeira vez.
const existentes = await vercel(`/v9/projects/${projetoId}/env`);
const tem = new Set((existentes.json.envs ?? []).map((e) => e.key));
const sortear = () => randomBytes(24).toString("base64url");
const codigo = `mexico-${randomBytes(3).toString("hex")}`;
const variaveis = {
  DATABASE_URL,
  DATABASE_URL_UNPOOLED,
  GEMINI_API_KEY,
  ...(tem.has("AUTH_SECRET") ? {} : { AUTH_SECRET: sortear() + sortear() }),
  ...(tem.has("CODIGO_DE_FUNDACAO") ? {} : { CODIGO_DE_FUNDACAO: codigo }),
  ...(process.env.GOOGLE_MAPS_API_KEY ? { GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY } : {}),
};
const env = await vercel(`/v10/projects/${projetoId}/env?upsert=true`, {
  metodo: "POST",
  corpo: Object.entries(variaveis).map(([key, value]) => ({
    key,
    value,
    type: "encrypted",
    target: ["production", "preview", "development"],
  })),
});
if (!env.ok) parar(`Não consegui cadastrar as variáveis: ${JSON.stringify(env.json).slice(0, 300)}`);
console.log(`  ✓ Variáveis: ${Object.keys(variaveis).join(", ")}`);

// ---------------------------------------------------------------------------
// 3. Publicar a main
// ---------------------------------------------------------------------------
console.log("→ Publicando a main…");
const dep = await vercel("/v13/deployments", {
  metodo: "POST",
  corpo: { name: NOME, project: projetoId, target: "production", gitSource: { type: "github", org: REPO.org, repo: REPO.repo, ref: "main" } },
});
if (!dep.ok) parar(`A Vercel não aceitou o deploy: ${JSON.stringify(dep.json).slice(0, 300)}`);

let estado = dep.json.readyState;
const depId = dep.json.id;
const inicio = Date.now();
while (!["READY", "ERROR", "CANCELED"].includes(estado)) {
  if (Date.now() - inicio > 15 * 60_000) parar("O deploy passou de 15 minutos. Veja no painel da Vercel.");
  await new Promise((r) => setTimeout(r, 10_000));
  const d = await vercel(`/v13/deployments/${depId}`);
  estado = d.json.readyState;
  process.stdout.write(`  … ${estado}\n`);
}
if (estado !== "READY") parar(`O deploy terminou em ${estado}. Os detalhes estão no painel da Vercel, projeto ${NOME}.`);

const final = await vercel(`/v9/projects/${projetoId}`);
const dominio = final.json.alias?.[0]?.domain ?? final.json.targets?.production?.alias?.[0] ?? `${NOME}.vercel.app`;
const endereco = `https://${dominio}`;

// Acorda o banco e confere que o app responde.
const saude = await fetch(`${endereco}/api/saude`).then((r) => r.json()).catch(() => ({}));

console.log(`
✓ No ar: ${endereco}
  Banco: ${saude.ok ? "respondendo" : "ainda acordando (tente /api/saude de novo em um minuto)"}
${variaveis.CODIGO_DE_FUNDACAO ? `  Código para criar a primeira conta: ${variaveis.CODIGO_DE_FUNDACAO}` : "  Código de criação: o mesmo de antes (está nas variáveis do projeto)."}
`);
