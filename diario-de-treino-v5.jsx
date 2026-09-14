import { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const MOD = {
  musc: { nome: "Musculação", cor: "#9A5A22", campo: "Grupo muscular" },
  pilates: { nome: "Pilates", cor: "#4C7F5C", campo: "Tipo" },
  natacao: { nome: "Natação", cor: "#33619C", campo: "Estilo" },
};
const ORDEM = ["musc", "pilates", "natacao"];
const GRUPOS = ["Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Quadríceps", "Posterior", "Glúteos", "Panturrilha", "Abdômen"];
const MUSC = [
  ["Supino reto com barra", "Peito"], ["Supino inclinado com barra", "Peito"], ["Supino declinado", "Peito"], ["Supino reto com halteres", "Peito"], ["Supino inclinado com halteres", "Peito"], ["Crucifixo com halteres", "Peito"], ["Crossover no cabo", "Peito"], ["Peck deck", "Peito"], ["Flexão de braço", "Peito"],
  ["Puxada frontal", "Costas"], ["Puxada supinada", "Costas"], ["Barra fixa", "Costas"], ["Remada curvada com barra", "Costas"], ["Remada baixa no cabo", "Costas"], ["Remada unilateral com halter", "Costas"], ["Remada cavalinho", "Costas"], ["Remada na máquina", "Costas"], ["Pulldown com braços estendidos", "Costas"], ["Levantamento terra", "Costas"],
  ["Desenvolvimento com halteres", "Ombros"], ["Desenvolvimento militar com barra", "Ombros"], ["Desenvolvimento na máquina", "Ombros"], ["Elevação lateral", "Ombros"], ["Elevação frontal", "Ombros"], ["Crucifixo inverso", "Ombros"], ["Face pull", "Ombros"], ["Encolhimento com halteres", "Ombros"],
  ["Rosca direta com barra", "Bíceps"], ["Rosca alternada", "Bíceps"], ["Rosca martelo", "Bíceps"], ["Rosca Scott", "Bíceps"], ["Rosca concentrada", "Bíceps"], ["Rosca no cabo", "Bíceps"],
  ["Tríceps pulley", "Tríceps"], ["Tríceps corda", "Tríceps"], ["Tríceps testa", "Tríceps"], ["Tríceps francês", "Tríceps"], ["Mergulho no banco", "Tríceps"], ["Tríceps coice", "Tríceps"],
  ["Agachamento livre", "Quadríceps"], ["Agachamento no smith", "Quadríceps"], ["Agachamento frontal", "Quadríceps"], ["Leg press 45°", "Quadríceps"], ["Hack machine", "Quadríceps"], ["Cadeira extensora", "Quadríceps"], ["Afundo com halteres", "Quadríceps"], ["Agachamento búlgaro", "Quadríceps"], ["Passada", "Quadríceps"],
  ["Stiff", "Posterior"], ["Levantamento terra romeno", "Posterior"], ["Mesa flexora", "Posterior"], ["Cadeira flexora", "Posterior"], ["Bom dia", "Posterior"],
  ["Elevação pélvica", "Glúteos"], ["Abdução na máquina", "Glúteos"], ["Coice no cabo", "Glúteos"], ["Cadeira abdutora", "Glúteos"],
  ["Panturrilha em pé", "Panturrilha"], ["Panturrilha sentado", "Panturrilha"], ["Panturrilha no leg press", "Panturrilha"],
  ["Abdominal supra", "Abdômen"], ["Abdominal infra", "Abdômen"], ["Prancha", "Abdômen"], ["Elevação de pernas na barra", "Abdômen"], ["Abdominal na polia", "Abdômen"], ["Abdominal oblíquo", "Abdômen"], ["Roda abdominal", "Abdômen"],
];
const bibliotecaInicial = [
  ...MUSC.map(([nome, cat], i) => ({ id: i + 1, mod: "musc", nome, cat })),
  { id: 201, mod: "pilates", nome: "Reformer", cat: "Aparelho" }, { id: 202, mod: "pilates", nome: "Cadillac", cat: "Aparelho" }, { id: 203, mod: "pilates", nome: "Chair", cat: "Aparelho" }, { id: 204, mod: "pilates", nome: "Mat", cat: "Solo" },
  { id: 301, mod: "natacao", nome: "Crawl", cat: "Estilo" }, { id: 302, mod: "natacao", nome: "Costas", cat: "Estilo" }, { id: 303, mod: "natacao", nome: "Peito", cat: "Estilo" }, { id: 304, mod: "natacao", nome: "Borboleta", cat: "Estilo" }, { id: 305, mod: "natacao", nome: "Pernada com prancha", cat: "Educativo" },
];

const hojeISO = () => new Date().toISOString().slice(0, 10);
const fmt = (iso) => { const [a, m, d] = iso.split("-"); return `${d}/${m}`; };
const fmtLonga = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
const mesNome = (ym) => new Date(ym + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "long" });
const volume = (s) => (s.itens || []).reduce((t, it) => t + (it.series || []).reduce((a, r) => a + (Number(r.carga) || 0) * (Number(r.reps) || 0), 0), 0);
const metros = (s) => (s.itens || []).reduce((t, it) => t + (Number(it.metros) || 0), 0);
const resumo = (s) => s.mod === "musc" ? `${volume(s).toLocaleString("pt-BR")} kg` : s.mod === "natacao" ? `${metros(s)} m` : `${s.duracaoMin || 0} min`;
const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const semanaDe = (iso) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); };

const REG = {
  Peito: [["r", 13, 14, 14, 7]], Costas: [["r", 13, 14, 14, 13]], Ombros: [["c", 10, 15, 3.6], ["c", 30, 15, 3.6]],
  Bíceps: [["r", 7, 15, 5, 9], ["r", 28, 15, 5, 9]], Tríceps: [["r", 7, 15, 5, 9], ["r", 28, 15, 5, 9]], Quadríceps: [["r", 14, 36, 5, 11], ["r", 21, 36, 5, 11]],
  Posterior: [["r", 14, 36, 5, 11], ["r", 21, 36, 5, 11]], Glúteos: [["r", 13, 32, 14, 5]], Panturrilha: [["r", 14, 47, 5, 9], ["r", 21, 47, 5, 9]],
  Abdômen: [["r", 15, 23, 10, 10]], Aparelho: [["r", 13, 20, 14, 14]], Solo: [["r", 13, 20, 14, 14]], Estilo: [["r", 13, 13, 14, 22]], Educativo: [["r", 14, 36, 5, 20], ["r", 21, 36, 5, 20]],
};
function Pict({ cat, cor, tam = 44 }) {
  const regs = REG[cat] || [];
  return (
    <svg width={tam} height={tam * 1.4} viewBox="0 0 40 58" aria-hidden="true" style={{ flexShrink: 0 }}>
      <g fill="#DCD6C8"><circle cx="20" cy="7" r="5" /><rect x="13" y="13" width="14" height="22" rx="3" /><rect x="7" y="14" width="5" height="20" rx="2.5" /><rect x="28" y="14" width="5" height="20" rx="2.5" /><rect x="14" y="35" width="5" height="22" rx="2.5" /><rect x="21" y="35" width="5" height="22" rx="2.5" /></g>
      <g fill={cor}>{regs.map((s, i) => s[0] === "c" ? <circle key={i} cx={s[1]} cy={s[2]} r={s[3]} /> : <rect key={i} x={s[1]} y={s[2]} width={s[3]} height={s[4]} rx="2" />)}</g>
    </svg>
  );
}
const ICO = {
  hoje: <path d="M3 12l9-8 9 8M5 10v10h14V10M10 20v-6h4v6" />,
  treinos: <path d="M2 10h3v4H2zM19 10h3v4h-3zM5 8h3v8H5zM16 8h3v8h-3zM8 12h8" />,
  biblioteca: <path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z" />,
  historico: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
  exportar: <path d="M12 15V4M7 9l5-5 5 5M4 15v5h16v-5" />,
};
const Icone = ({ k }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICO[k]}</svg>;
const Lixo = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;

const css = `
.dt{--papel:#F6F3EC;--tinta:#2B2A26;--cinza:#7A7468;--regua:#D8D2C4;--fina:#EAE5D9;--branco:#FFFDF8;
  max-width:430px;margin:0 auto;min-height:100vh;background:var(--papel);color:var(--tinta);font-family:"Iowan Old Style","Palatino Linotype","Palatino","Book Antiqua",Georgia,serif;padding:0 0 92px;position:relative;font-weight:400}
.dt *{box-sizing:border-box}
.dt h1{font-size:28px;font-weight:400;letter-spacing:-.01em;margin:0}
.dt h2{font-size:13px;font-weight:400;font-style:italic;color:var(--cinza);margin:28px 0 6px;padding-bottom:6px;border-bottom:1px solid var(--tinta)}
.dt .top{padding:24px 22px 4px}
.dt .sub{color:var(--cinza);font-size:14px;font-style:italic;margin-top:2px}
.dt .sec{padding:0 22px}
.dt .g{font-size:72px;line-height:1;font-weight:400;letter-spacing:-.04em;font-variant-numeric:tabular-nums;margin-top:14px}
.dt .l{font-size:16px;color:var(--cinza);margin:6px 0 18px}
.dt .l span{white-space:nowrap}
.dt .l span::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--c);margin:0 5px 0 12px;vertical-align:1px}
.dt .semana{display:flex;gap:5px;margin-bottom:8px}
.dt .semana div{flex:1;height:58px;background:var(--branco);border:1px solid var(--regua);border-radius:4px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;padding-bottom:6px;font-size:13px;color:var(--cinza);position:relative;overflow:hidden}
.dt .semana .bs{position:absolute;top:0;left:0;right:0;display:flex;height:5px}
.dt .semana i{flex:1;display:block}
.dt .semana div.h{background:var(--tinta);color:var(--papel);border-color:var(--tinta)}
.dt .stats{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px}
.dt .stat{background:var(--branco);border:1px solid var(--regua);border-radius:4px;padding:12px 14px}
.dt .stat b{display:block;font-size:30px;font-weight:400;line-height:1.05;font-variant-numeric:tabular-nums}
.dt .stat span{display:block;font-size:13px;color:var(--cinza);font-style:italic;margin-top:4px}
.dt .stat em{display:block;font-style:italic;font-size:12px;margin-top:2px}
.dt .li{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:14px 0;border-bottom:1px solid var(--fina);font-size:16px}
.dt .li:last-child{border-bottom:0}
.dt .li small{display:block;font-size:13px;color:var(--cinza);font-style:italic;margin-top:1px}
.dt .li b{font-weight:400;font-size:22px;font-variant-numeric:tabular-nums;white-space:nowrap}
.dt .li .t{flex:1;min-width:0}
.dt .li em{font-style:italic;font-size:13px;color:var(--cinza)}
.dt .lin{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--fina);width:100%;border-left:0;border-right:0;border-top:0;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer;font-size:16px}
.dt .lin .t{flex:1;min-width:0}
.dt .lin .t small{display:block;color:var(--cinza);font-size:13px;font-style:italic;margin-top:1px}
.dt .lin .num{font-size:17px;font-variant-numeric:tabular-nums;white-space:nowrap}
.dt .lin .mk{width:3px;align-self:stretch;border-radius:2px;background:var(--c)}
.dt .ver{font-size:13px;color:var(--cinza);font-style:italic}
.dt .x{border:0;background:none;color:var(--cinza);padding:6px;cursor:pointer;border-radius:6px;display:flex;font:inherit}
.dt .x.conf{background:#8E2B1F;color:#fff;font-size:14px;padding:6px 12px}
.dt .btn{display:block;width:100%;padding:14px;border-radius:8px;border:1px solid var(--tinta);font:inherit;font-size:17px;cursor:pointer;background:var(--tinta);color:var(--papel);margin-top:16px}
.dt .btn.q{background:transparent;color:var(--tinta);margin-top:8px}
.dt .btn:disabled{opacity:.35;cursor:default}
.dt .campo{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;font-size:14px;color:var(--cinza);font-style:italic}
.dt input,.dt select,.dt textarea{font:inherit;font-style:normal;font-size:17px;padding:11px 12px;border:1px solid var(--regua);border-radius:6px;background:var(--branco);color:var(--tinta);width:100%}
.dt input:focus,.dt select:focus,.dt textarea:focus{outline:none;border-color:var(--tinta)}
.dt .exer{padding:14px 0 6px;border-bottom:1px solid var(--regua);margin-bottom:6px}
.dt .exer h3{margin:0;font-size:18px;font-weight:400}
.dt .cab{display:flex;gap:12px;align-items:center;margin-bottom:10px;cursor:pointer;border:0;background:none;padding:0;text-align:left;font:inherit;color:inherit;width:100%}
.dt .ult{font-size:13px;color:var(--cinza);font-style:italic}
.dt .serie{display:grid;grid-template-columns:24px 1fr 1fr 30px;gap:8px;align-items:center;margin-bottom:8px;font-size:14px;color:var(--cinza)}
.dt .serie input{padding:9px 10px}
.dt .mais{background:none;border:0;color:var(--tinta);font:inherit;font-size:14px;padding:4px 0 8px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.dt .seg{display:flex;border-bottom:1px solid var(--regua);margin-bottom:16px}
.dt .seg button{flex:1;border:0;background:transparent;font:inherit;font-size:15px;padding:10px 4px;cursor:pointer;color:var(--cinza);border-bottom:2px solid transparent;margin-bottom:-1px}
.dt .seg button.on{color:var(--tinta);border-bottom-color:var(--tinta)}
.dt .chk{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--fina);font-size:16px}
.dt .chk input{width:auto;accent-color:var(--tinta)}
.dt .rel{border:1px solid var(--regua);background:var(--branco);padding:20px;font-size:14px;line-height:1.5}
.dt .rel h3{font-size:22px;margin:0;font-weight:400}
.dt .rel table{width:100%;border-collapse:collapse;margin-top:12px;font-variant-numeric:tabular-nums}
.dt .rel td{padding:8px 0;border-top:1px solid var(--fina);vertical-align:top}
.dt .rel td:last-child{text-align:right;color:var(--cinza);white-space:nowrap}
.dt .kpis{display:flex;gap:18px;margin:14px 0 4px}
.dt .kpi b{display:block;font-size:26px;font-weight:400;line-height:1.1}
.dt .kpi span{font-size:12px;color:var(--cinza);font-style:italic}
.dt .nav{position:fixed;left:0;right:0;bottom:0;display:flex;justify-content:center;background:var(--papel);border-top:1px solid var(--regua);padding-bottom:env(safe-area-inset-bottom)}
.dt .nav div{display:flex;width:100%;max-width:430px}
.dt .nav button{flex:1;border:0;background:none;font:inherit;font-size:11px;padding:10px 0 10px;color:var(--cinza);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px}
.dt .nav button.on{color:var(--tinta)}
.dt .toast{position:fixed;left:50%;transform:translateX(-50%);bottom:88px;background:var(--tinta);color:var(--papel);padding:10px 18px;border-radius:999px;font-size:14px;z-index:5;white-space:nowrap}
.dt .vazio{color:var(--cinza);font-size:15px;font-style:italic;padding:16px 0;line-height:1.5}
.dt .fundo{position:fixed;inset:0;background:rgba(43,42,38,.45);z-index:10;display:flex;align-items:flex-end;justify-content:center}
.dt .folha{background:var(--papel);width:100%;max-width:430px;border-radius:16px 16px 0 0;padding:20px 22px 30px;max-height:88vh;overflow:auto}
.dt .video{background:var(--tinta);border-radius:8px;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;color:var(--papel);margin:16px 0;position:relative}
.dt .play{width:56px;height:56px;border-radius:50%;background:var(--papel);display:flex;align-items:center;justify-content:center}
.dt .play::after{content:"";border-left:18px solid var(--tinta);border-top:11px solid transparent;border-bottom:11px solid transparent;margin-left:5px}
.dt .video small{position:absolute;bottom:10px;left:0;right:0;text-align:center;font-size:12px;opacity:.75;font-style:italic}
.dt .busca{position:sticky;top:0;background:var(--papel);padding:8px 0 10px;z-index:2}
.dt .aviso{border-left:2px solid var(--tinta);padding:6px 12px;font-size:14px;font-style:italic;color:var(--cinza);margin:14px 0}
.dt .grupo{color:var(--c)}
`;

export default function DiarioDeTreino() {
  const [exercicios, setExercicios] = useState(bibliotecaInicial);
  const [treinos, setTreinos] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [aba, setAba] = useState("hoje");
  const [ativa, setAtiva] = useState(null);
  const [toast, setToast] = useState("");
  const [novoEx, setNovoEx] = useState({ nome: "", cat: "Peito" });
  const [novoTr, setNovoTr] = useState(null);
  const [grafico, setGrafico] = useState("semana");
  const [exGraf, setExGraf] = useState(1);
  const [bib, setBib] = useState("musc");
  const [busca, setBusca] = useState("");
  const [detalhe, setDetalhe] = useState(null);
  const [modo, setModo] = useState("escolher");
  const [texto, setTexto] = useState("");
  const [lendo, setLendo] = useState(false);
  const [confirmar, setConfirmar] = useState(null);

  const ex = (id) => exercicios.find((e) => e.id === id) || { nome: "?", cat: "" };
  const avisar = (m) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const ultimaSerie = (exId, antesDe) => {
    const s = [...sessoes].filter((x) => !antesDe || x.data < antesDe).sort((a, b) => b.data.localeCompare(a.data)).find((x) => x.mod === "musc" && (x.itens || []).some((i) => i.exId === exId));
    if (!s) return null;
    const it = s.itens.find((i) => i.exId === exId);
    const best = it.series.reduce((a, r) => (Number(r.carga) > Number(a.carga) ? r : a), it.series[0]);
    return { data: s.data, carga: best.carga, reps: best.reps };
  };
  const iniciar = (t) => {
    const base = { id: Date.now(), data: hojeISO(), mod: t.mod, nome: t.nome };
    if (t.mod === "musc") base.itens = t.itens.map((i) => { const u = ultimaSerie(i.exId); return { exId: i.exId, series: Array.from({ length: i.series }, () => ({ carga: u ? u.carga : "", reps: i.reps })) }; });
    else if (t.mod === "natacao") base.itens = t.itens.map((i) => ({ exId: i.exId, metros: "", tempoMin: "" }));
    else { base.duracaoMin = ""; base.obs = ""; }
    setAtiva(base);
  };
  const salvarSessao = () => {
    let lib = exercicios; const s = structuredClone(ativa); delete s.origem;
    (s.itens || []).forEach((it) => { if (!it.exId && it.nome) { const n = { id: Date.now() + Math.floor(Math.random() * 1000), mod: s.mod, nome: it.nome, cat: it.cat || (s.mod === "musc" ? "Abdômen" : "Estilo") }; lib = [...lib, n]; it.exId = n.id; } delete it.nome; delete it.cat; });
    setExercicios(lib); setSessoes([...sessoes, s]); setAtiva(null); setTexto(""); setAba("hoje"); avisar("Treino salvo");
  };

  const interpretar = async () => {
    setLendo(true);
    const lista = exercicios.map((e) => `${e.id}|${e.mod}|${e.nome}|${e.cat}`).join("\n");
    const prompt = `Você converte a descrição de um treino, escrita em português informal, em JSON. Data de hoje: ${hojeISO()}.
Biblioteca de exercícios (id|modalidade|nome|categoria):
${lista}

Regras: escolha o exercício da biblioteca mais próximo do que a pessoa escreveu (ex.: "supino" = "Supino reto com barra", "leg" = "Leg press 45°"). Se não existir nada parecido, use exId null e preencha nome e cat (cat deve ser um destes para musculação: ${GRUPOS.join(", ")}). "3 de 10 com 50kg", "3x10 50", "3 séries de 10 a 50 quilos" significam 3 séries de 10 repetições com 50 kg. Se disser "ontem", use a data de ontem. mod é "musc", "pilates" ou "natacao".
Responda SOMENTE com JSON válido, sem texto antes ou depois, no formato:
{"mod":"musc","nome":"título curto do treino","data":"YYYY-MM-DD","itens":[{"exId":1,"nome":"","cat":"","series":[{"carga":50,"reps":10}]}],"duracaoMin":null,"obs":""}
Para natação, cada item tem "metros" e "tempoMin" em vez de "series". Para pilates, itens pode ser vazio e use duracaoMin e obs.

Descrição: ${texto}`;
    let dados = null;
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }) });
      const d = await r.json();
      dados = JSON.parse((d.content || []).map((c) => c.text || "").join("").replace(/```json|```/g, "").trim());
    } catch (e) { dados = fallback(); }
    setLendo(false);
    if (!dados || !dados.mod) { avisar("Não entendi. Tente: supino 3 de 10 com 50 kg"); return; }
    const s = { id: Date.now(), origem: "texto", data: dados.data || hojeISO(), mod: dados.mod, nome: dados.nome || `Treino de ${fmt(dados.data || hojeISO())}`, obs: dados.obs || "", duracaoMin: dados.duracaoMin || "" };
    s.itens = (dados.itens || []).map((i) => dados.mod === "musc"
      ? { exId: i.exId || null, nome: i.nome, cat: i.cat, series: (i.series || []).map((r) => ({ carga: r.carga ?? "", reps: r.reps ?? "" })) }
      : { exId: i.exId || null, nome: i.nome, cat: i.cat, metros: i.metros ?? "", tempoMin: i.tempoMin ?? "" });
    setAtiva(s);
  };
  const fallback = () => {
    const partes = texto.split(/[,;.]| e /i).map((p) => p.trim()).filter(Boolean); const itens = [];
    for (const p of partes) {
      const m = p.match(/(\d+)\s*(?:x|de|séries? de)\s*(\d+)\s*(?:com|a|@)?\s*(\d+(?:[.,]\d+)?)\s*(?:kg|quilos)?/i);
      const e = exercicios.filter((x) => x.mod === "musc").find((x) => norm(p).includes(norm(x.nome).split(" ")[0]));
      if (m && e) itens.push({ exId: e.id, series: Array.from({ length: Number(m[1]) }, () => ({ carga: Number(m[3].replace(",", ".")), reps: Number(m[2]) })) });
    }
    return itens.length ? { mod: "musc", nome: `Treino de ${fmt(hojeISO())}`, data: hojeISO(), itens } : null;
  };
  const excluirSessao = (id) => { setSessoes(sessoes.filter((s) => s.id !== id)); setConfirmar(null); avisar("Treino excluído"); };
  const excluirTreino = (id) => { setTreinos(treinos.filter((t) => t.id !== id)); setConfirmar(null); avisar("Modelo excluído"); };

  const hoje = hojeISO(); const mesAtual = hoje.slice(0, 7);
  const mesAnt = (() => { const d = new Date(hoje + "T12:00:00"); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
  const doMes = sessoes.filter((s) => s.data.startsWith(mesAtual)).sort((a, b) => a.data.localeCompare(b.data));
  const doMesAnt = sessoes.filter((s) => s.data.startsWith(mesAnt));
  const volMes = doMes.filter((s) => s.mod === "musc").reduce((t, s) => t + volume(s), 0);
  const volMesAnt = doMesAnt.filter((s) => s.mod === "musc").reduce((t, s) => t + volume(s), 0);
  const mMes = doMes.reduce((t, s) => t + metros(s), 0);
  const minPil = doMes.filter((s) => s.mod === "pilates").reduce((t, s) => t + (Number(s.duracaoMin) || 0), 0);
  const semanasComTreino = new Set(sessoes.map((s) => semanaDe(s.data)));
  let sequencia = 0; { let w = semanaDe(hoje); while (semanasComTreino.has(w)) { sequencia++; const d = new Date(w + "T12:00:00"); d.setDate(d.getDate() - 7); w = d.toISOString().slice(0, 10); } }
  const recordes = exercicios.filter((e) => e.mod === "musc").map((e) => {
    const ult = ultimaSerie(e.id); if (!ult) return null; const ant = ultimaSerie(e.id, ult.data); if (!ant) return null;
    return Number(ult.carga) > Number(ant.carga) ? { ex: e, de: ant.carga, para: ult.carga, data: ult.data } : null;
  }).filter(Boolean).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 3);
  const maxVol = Math.max(1, ...sessoes.filter((s) => s.mod === "musc").map(volume)), maxM = Math.max(1, ...sessoes.filter((s) => s.mod === "natacao").map(metros)), maxP = Math.max(1, ...sessoes.filter((s) => s.mod === "pilates").map((s) => Number(s.duracaoMin) || 0));
  const altura = (s) => 10 + 34 * (s.mod === "musc" ? volume(s) / maxVol : s.mod === "natacao" ? metros(s) / maxM : (Number(s.duracaoMin) || 0) / maxP);
  const semana = Array.from({ length: 7 }, (_, k) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + k); const iso = d.toISOString().slice(0, 10);
    return { iso, n: d.getDate(), ss: sessoes.filter((s) => s.data === iso) };
  });
  const semanas = Array.from({ length: 6 }, (_, k) => {
    const fim = new Date(); fim.setDate(fim.getDate() - (5 - k) * 7); const ini = new Date(fim); ini.setDate(ini.getDate() - 6);
    const dentro = (s) => { const d = new Date(s.data + "T12:00:00"); return d >= ini && d <= fim; };
    const r = { semana: fmt(ini.toISOString().slice(0, 10)) }; ORDEM.forEach((m) => (r[m] = sessoes.filter((s) => s.mod === m && dentro(s)).length)); return r;
  });
  const progressao = sessoes.filter((s) => s.mod === "musc" && (s.itens || []).some((i) => i.exId === exGraf)).sort((a, b) => a.data.localeCompare(b.data))
    .map((s) => ({ data: fmt(s.data), carga: Math.max(...s.itens.find((i) => i.exId === exGraf).series.map((r) => Number(r.carga) || 0)) }));
  const listaBib = exercicios.filter((e) => e.mod === bib && (!busca || norm(e.nome).includes(norm(busca)) || norm(e.cat).includes(norm(busca))));
  const cats = bib === "musc" ? GRUPOS : [...new Set(listaBib.map((e) => e.cat))];
  const vazio = sessoes.length === 0;

  const Excluir = ({ id, onConfirm }) => confirmar === id
    ? <button className="x conf" onClick={onConfirm}>Excluir</button>
    : <button className="x" aria-label="Excluir" onClick={() => setConfirmar(id)}><Lixo /></button>;

  return (
    <div className="dt" onClick={() => confirmar && setConfirmar(null)}>
      <style>{css}</style>

      {aba === "hoje" && !ativa && (
        <>
          <div className="top"><h1>Diário de treino</h1><div className="sub">{fmtLonga(hoje)}</div></div>
          <div className="sec">
            <div className="g">{doMes.length}</div>
            <div className="l">{doMes.length === 1 ? "treino" : "treinos"} em {mesNome(mesAtual)}{doMesAnt.length ? ` · ${doMesAnt.length} em ${mesNome(mesAnt)}` : ""}
              {doMes.length > 0 && <><br />{ORDEM.map((m) => { const n = doMes.filter((s) => s.mod === m).length; return n ? <span key={m} style={{ "--c": MOD[m].cor }}>{n} {MOD[m].nome.toLowerCase()}</span> : null; })}</>}
            </div>
            <div className="semana">
              {semana.map((d) => (
                <div key={d.iso} className={d.iso === hoje ? "h" : ""}><div className="bs">{d.ss.map((s) => <i key={s.id} style={{ background: MOD[s.mod].cor }} />)}</div>{["D", "S", "T", "Q", "Q", "S", "S"][new Date(d.iso + "T12:00:00").getDay()]}</div>
              ))}
            </div>
            <div className="stats">
              <div className="stat"><b>{sequencia}</b><span>{sequencia === 1 ? "semana seguida" : "semanas seguidas"}</span></div>
              <div className="stat"><b>{volMes >= 10000 ? `${(volMes / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t` : `${volMes.toLocaleString("pt-BR")} kg`}</b><span>levantados no mês</span>{volMesAnt > 0 && <em style={{ color: volMes >= volMesAnt ? MOD.pilates.cor : MOD.musc.cor }}>{volMes >= volMesAnt ? "+" : ""}{Math.round(((volMes - volMesAnt) / volMesAnt) * 100)}% sobre {mesNome(mesAnt)}</em>}</div>
              <div className="stat"><b>{mMes.toLocaleString("pt-BR")}</b><span>metros nadados</span></div>
              <div className="stat"><b>{minPil}</b><span>min de pilates</span></div>
            </div>
            {vazio && <div className="vazio">Seu diário começa hoje. Monte seus treinos na aba Treinos e registre cada um aqui; os números acima vão se preenchendo.</div>}
            {recordes.length > 0 && (<>
              <h2>Recordes recentes</h2>
              {recordes.map((r) => <div className="li" key={r.ex.id}><span className="t">{r.ex.nome}<small>{fmt(r.data)}</small></span><b>{r.de} → {r.para} kg</b></div>)}
            </>)}

            <h2>Registrar treino</h2>
            <div className="seg" style={{ marginTop: 10 }}>
              <button className={modo === "escolher" ? "on" : ""} onClick={() => setModo("escolher")}>Meus treinos</button>
              <button className={modo === "escrever" ? "on" : ""} onClick={() => setModo("escrever")}>Escrever o que fiz</button>
            </div>
            {modo === "escolher" && (treinos.length ? treinos.map((t) => (
              <button key={t.id} className="lin" onClick={() => iniciar(t)}>
                <span className="mk" style={{ "--c": MOD[t.mod].cor }} />
                <span className="t">{t.nome}<small>{MOD[t.mod].nome} · {t.itens.length} {t.itens.length === 1 ? "exercício" : "exercícios"}</small></span>
              </button>
            )) : <div className="vazio">Os treinos que você montar na aba Treinos aparecem aqui. Toque em um para registrar.</div>)}
            {modo === "escrever" && (<>
              <textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={"hoje fiz supino reto 3 de 10 com 50 kg, puxada 3x12 com 45 e rosca direta 3 de 10 com 20\n\nnadei 1000 m de crawl em 25 min\n\npilates de aparelho, 50 min"} />
              <button className="btn" disabled={!texto.trim() || lendo} onClick={interpretar}>{lendo ? "Lendo o que você escreveu…" : "Converter em treino"}</button>
              <div className="sub" style={{ marginTop: 8 }}>Você confere tudo antes de salvar.</div>
            </>)}
          </div>
        </>
      )}

      {ativa && (
        <div className="sec" style={{ paddingTop: 24 }}>
          <div className="sub" style={{ color: MOD[ativa.mod].cor, fontStyle: "normal" }}>{MOD[ativa.mod].nome}</div>
          <h1>{ativa.nome}</h1>
          {ativa.origem === "texto" && <div className="aviso">Foi isso que entendi do seu texto. Corrija o que precisar e salve.</div>}
          <div className="campo" style={{ marginTop: 14 }}>Data<input type="date" value={ativa.data} onChange={(e) => setAtiva({ ...ativa, data: e.target.value })} /></div>

          {ativa.mod === "musc" && ativa.itens.map((it, ii) => {
            const e = it.exId ? ex(it.exId) : { nome: it.nome, cat: it.cat, mod: "musc", novo: true }; const u = it.exId ? ultimaSerie(it.exId, ativa.data) : null;
            return (
              <div className="exer" key={ii}>
                <button className="cab" onClick={() => !e.novo && setDetalhe(e)}>
                  <Pict cat={e.cat} cor={MOD.musc.cor} tam={30} />
                  <span style={{ flex: 1 }}><h3>{e.nome}</h3><span className="ult">{e.novo ? "Novo — entra na biblioteca ao salvar" : u ? `Último treino (${fmt(u.data)}): ${u.carga} kg × ${u.reps}` : "Primeira vez registrando"}</span></span>
                  <Excluir id={`it-${ii}`} onConfirm={() => { const c = structuredClone(ativa); c.itens.splice(ii, 1); setAtiva(c); setConfirmar(null); }} />
                </button>
                <div className="serie" style={{ marginBottom: 4, fontStyle: "italic" }}><span /><span>kg</span><span>reps</span><span /></div>
                {it.series.map((r, ri) => (
                  <div className="serie" key={ri}>
                    <span>{ri + 1}</span>
                    <input type="number" inputMode="decimal" value={r.carga} onChange={(ev) => { const c = structuredClone(ativa); c.itens[ii].series[ri].carga = ev.target.value; setAtiva(c); }} />
                    <input type="number" inputMode="numeric" value={r.reps} onChange={(ev) => { const c = structuredClone(ativa); c.itens[ii].series[ri].reps = ev.target.value; setAtiva(c); }} />
                    <button className="x" aria-label="Remover série" onClick={() => { const c = structuredClone(ativa); c.itens[ii].series.splice(ri, 1); setAtiva(c); }}>×</button>
                  </div>
                ))}
                <button className="mais" onClick={() => { const c = structuredClone(ativa); const last = c.itens[ii].series.at(-1) || { carga: "", reps: "" }; c.itens[ii].series.push({ ...last }); setAtiva(c); }}>Adicionar série</button>
              </div>
            );
          })}

          {ativa.mod === "natacao" && ativa.itens.map((it, ii) => (
            <div className="exer" key={ii}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}><h3 style={{ flex: 1 }}>{it.exId ? ex(it.exId).nome : it.nome}</h3><Excluir id={`it-${ii}`} onConfirm={() => { const c = structuredClone(ativa); c.itens.splice(ii, 1); setAtiva(c); setConfirmar(null); }} /></div>
              <div className="serie" style={{ gridTemplateColumns: "1fr 1fr", fontStyle: "italic" }}>
                <label>Metros<input type="number" inputMode="numeric" value={it.metros} onChange={(e) => { const c = structuredClone(ativa); c.itens[ii].metros = e.target.value; setAtiva(c); }} /></label>
                <label>Minutos<input type="number" inputMode="numeric" value={it.tempoMin} onChange={(e) => { const c = structuredClone(ativa); c.itens[ii].tempoMin = e.target.value; setAtiva(c); }} /></label>
              </div>
            </div>
          ))}

          {ativa.mod === "pilates" && (<>
            <div className="campo">Duração (min)<input type="number" inputMode="numeric" value={ativa.duracaoMin} onChange={(e) => setAtiva({ ...ativa, duracaoMin: e.target.value })} /></div>
            <div className="campo">Observações<textarea rows={3} value={ativa.obs} onChange={(e) => setAtiva({ ...ativa, obs: e.target.value })} placeholder="O que trabalhou, como se sentiu" /></div>
          </>)}

          <button className="btn" onClick={salvarSessao}>Salvar treino</button>
          <button className="btn q" onClick={() => setAtiva(null)}>Descartar</button>
        </div>
      )}

      {aba === "treinos" && (
        <>
          <div className="top"><h1>Treinos</h1><div className="sub">Modelos que você monta e repete</div></div>
          <div className="sec">
            {!novoTr && treinos.map((t) => (
              <div key={t.id} className="lin" style={{ cursor: "default" }}>
                <span className="mk" style={{ "--c": MOD[t.mod].cor }} />
                <span className="t">{t.nome}<small>{t.itens.map((i) => ex(i.exId).nome + (i.series ? ` ${i.series}×${i.reps}` : "")).join(" · ")}</small></span>
                <Excluir id={`tr-${t.id}`} onConfirm={() => excluirTreino(t.id)} />
              </div>
            ))}
            {!novoTr && !treinos.length && <div className="vazio" style={{ paddingTop: 30 }}>Um treino montado é uma lista de exercícios com séries e repetições planejadas — o "A", o "B", o dia de pilates. Depois de montado, registrar é só preencher as cargas.</div>}
            {!novoTr && <button className="btn" onClick={() => { setNovoTr({ mod: "musc", nome: "", itens: [] }); setBusca(""); }}>Montar treino</button>}
            {novoTr && (
              <div>
                <div className="seg" style={{ marginTop: 10 }}>{ORDEM.map((m) => <button key={m} className={novoTr.mod === m ? "on" : ""} onClick={() => setNovoTr({ ...novoTr, mod: m, itens: [] })}>{MOD[m].nome}</button>)}</div>
                <div className="campo">Nome do treino<input value={novoTr.nome} onChange={(e) => setNovoTr({ ...novoTr, nome: e.target.value })} placeholder={novoTr.mod === "musc" ? "A · Peito e tríceps" : "Ex.: Natação longa"} /></div>
                <h2>Exercícios {novoTr.itens.length ? `(${novoTr.itens.length})` : ""}</h2>
                <input placeholder="Buscar exercício" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ margin: "10px 0" }} />
                {exercicios.filter((e) => e.mod === novoTr.mod && (!busca || norm(e.nome).includes(norm(busca)) || norm(e.cat).includes(norm(busca)))).map((e) => {
                  const it = novoTr.itens.find((i) => i.exId === e.id);
                  return (
                    <label key={e.id} className="chk">
                      <input type="checkbox" checked={!!it} onChange={(ev) => setNovoTr({ ...novoTr, itens: ev.target.checked ? [...novoTr.itens, novoTr.mod === "musc" ? { exId: e.id, series: 3, reps: 10 } : { exId: e.id }] : novoTr.itens.filter((i) => i.exId !== e.id) })} />
                      <Pict cat={e.cat} cor={MOD[e.mod].cor} tam={20} />
                      <span style={{ flex: 1, minWidth: 0 }}>{e.nome}<span style={{ display: "block", fontSize: 12, color: "var(--cinza)", fontStyle: "italic" }}>{e.cat}</span></span>
                      {it && novoTr.mod === "musc" && (
                        <span style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 14 }}>
                          <input type="number" style={{ width: 46, padding: 6 }} value={it.series} onChange={(ev) => setNovoTr({ ...novoTr, itens: novoTr.itens.map((i) => i.exId === e.id ? { ...i, series: Number(ev.target.value) } : i) })} />×
                          <input type="number" style={{ width: 46, padding: 6 }} value={it.reps} onChange={(ev) => setNovoTr({ ...novoTr, itens: novoTr.itens.map((i) => i.exId === e.id ? { ...i, reps: Number(ev.target.value) } : i) })} />
                        </span>
                      )}
                    </label>
                  );
                })}
                <button className="btn" disabled={!novoTr.nome || !novoTr.itens.length} onClick={() => { setTreinos([...treinos, { ...novoTr, id: Date.now() }]); setNovoTr(null); avisar("Treino montado"); }}>Salvar treino</button>
                <button className="btn q" onClick={() => setNovoTr(null)}>Cancelar</button>
              </div>
            )}
          </div>
        </>
      )}

      {aba === "biblioteca" && (
        <>
          <div className="top"><h1>Biblioteca</h1><div className="sub">{exercicios.filter((e) => e.mod === bib).length} exercícios · toque para ver a execução</div></div>
          <div className="sec">
            <div className="busca">
              <div className="seg" style={{ marginBottom: 10 }}>{ORDEM.map((m) => <button key={m} className={bib === m ? "on" : ""} onClick={() => { setBib(m); setNovoEx({ nome: "", cat: m === "musc" ? "Peito" : "" }); }}>{MOD[m].nome}</button>)}</div>
              <input placeholder="Buscar por nome ou músculo" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            {cats.map((c) => {
              const lista = listaBib.filter((e) => e.cat === c); if (!lista.length) return null;
              return (
                <div key={c}>
                  <h2 className="grupo" style={{ "--c": MOD[bib].cor, borderBottomColor: MOD[bib].cor, marginTop: 18 }}>{c}</h2>
                  {lista.map((e) => (
                    <button key={e.id} className="lin" onClick={() => setDetalhe(e)}>
                      <Pict cat={e.cat} cor={MOD[bib].cor} tam={26} /><span className="t">{e.nome}</span><span className="ver">ver</span>
                    </button>
                  ))}
                </div>
              );
            })}
            {!listaBib.length && <div className="vazio">Nenhum exercício com esse nome. Adicione abaixo.</div>}
            <h2>Novo exercício</h2>
            <div className="campo" style={{ marginTop: 10 }}>Nome<input value={novoEx.nome} onChange={(e) => setNovoEx({ ...novoEx, nome: e.target.value })} /></div>
            <div className="campo">{MOD[bib].campo}{bib === "musc" ? (
              <select value={novoEx.cat} onChange={(e) => setNovoEx({ ...novoEx, cat: e.target.value })}>{GRUPOS.map((g) => <option key={g}>{g}</option>)}</select>
            ) : <input value={novoEx.cat} onChange={(e) => setNovoEx({ ...novoEx, cat: e.target.value })} />}</div>
            <button className="btn" disabled={!novoEx.nome} onClick={() => { setExercicios([...exercicios, { ...novoEx, mod: bib, id: Date.now() }]); setNovoEx({ ...novoEx, nome: "" }); avisar("Exercício adicionado"); }}>Adicionar à biblioteca</button>
          </div>
        </>
      )}

      {aba === "historico" && (
        <>
          <div className="top"><h1>Histórico</h1><div className="sub">{sessoes.length ? `${sessoes.length} ${sessoes.length === 1 ? "treino registrado" : "treinos registrados"}` : "Nenhum treino ainda"}</div></div>
          <div className="sec">
            {vazio ? <div className="vazio" style={{ paddingTop: 30 }}>Aqui ficam todos os treinos que você registrou, com gráficos de frequência por semana e evolução de carga por exercício. Registre o primeiro na tela Início.</div> : (<>
              <div className="seg" style={{ marginTop: 10 }}>
                <button className={grafico === "semana" ? "on" : ""} onClick={() => setGrafico("semana")}>Treinos por semana</button>
                <button className={grafico === "carga" ? "on" : ""} onClick={() => setGrafico("carga")}>Evolução de carga</button>
              </div>
              {grafico === "semana" ? (
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={semanas} barGap={2}>
                    <CartesianGrid vertical={false} stroke="#EAE5D9" />
                    <XAxis dataKey="semana" tick={{ fontSize: 12, fill: "#7A7468", fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} width={22} tick={{ fontSize: 12, fill: "#7A7468" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontFamily: "inherit", background: "#FFFDF8", border: "1px solid #D8D2C4" }} />
                    {ORDEM.map((m) => <Bar key={m} dataKey={m} name={MOD[m].nome} fill={MOD[m].cor} radius={[2, 2, 0, 0]} />)}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <>
                  <select value={exGraf} onChange={(e) => setExGraf(Number(e.target.value))} style={{ marginBottom: 12 }}>{exercicios.filter((e) => e.mod === "musc").map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select>
                  {progressao.length ? (
                    <ResponsiveContainer width="100%" height={170}>
                      <LineChart data={progressao}>
                        <CartesianGrid vertical={false} stroke="#EAE5D9" />
                        <XAxis dataKey="data" tick={{ fontSize: 12, fill: "#7A7468" }} axisLine={false} tickLine={false} />
                        <YAxis width={34} tick={{ fontSize: 12, fill: "#7A7468" }} axisLine={false} tickLine={false} domain={["dataMin - 5", "dataMax + 5"]} />
                        <Tooltip formatter={(v) => [`${v} kg`, "Carga máxima"]} contentStyle={{ fontFamily: "inherit", background: "#FFFDF8", border: "1px solid #D8D2C4" }} />
                        <Line type="monotone" dataKey="carga" stroke={MOD.musc.cor} strokeWidth={2} dot={{ r: 4, fill: MOD.musc.cor }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <div className="vazio">Registre um treino com esse exercício para ver a evolução.</div>}
                </>
              )}
              <h2>Todos os treinos</h2>
              {[...sessoes].sort((a, b) => b.data.localeCompare(a.data)).map((s) => (
                <div key={s.id} className="lin" style={{ cursor: "default" }}>
                  <span className="mk" style={{ "--c": MOD[s.mod].cor }} />
                  <span className="t">{s.nome}<small>{fmtLonga(s.data)}</small></span>
                  <span className="num">{resumo(s)}</span>
                  <Excluir id={`s-${s.id}`} onConfirm={() => excluirSessao(s.id)} />
                </div>
              ))}
            </>)}
          </div>
        </>
      )}

      {aba === "exportar" && (
        <>
          <div className="top"><h1>Exportar</h1><div className="sub">Prévia do relatório em PDF</div></div>
          <div className="sec" style={{ paddingTop: 14 }}>
            {vazio ? <div className="vazio" style={{ paddingTop: 16 }}>O relatório mensal reúne todos os treinos do mês, exercício por exercício, com os totais de cada modalidade. Ele aparece aqui assim que houver o primeiro registro.</div> : (<>
              <div className="rel">
                <h3>Diário de treino</h3>
                <div style={{ color: "var(--cinza)", fontStyle: "italic" }}>{new Date(mesAtual + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} · Bruno</div>
                <div className="kpis">{ORDEM.map((m) => { const n = doMes.filter((s) => s.mod === m).length; return n ? <div key={m} className="kpi"><b style={{ color: MOD[m].cor }}>{n}</b><span>{MOD[m].nome}</span></div> : null; })}</div>
                <table><tbody>
                  {doMes.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <b style={{ fontWeight: 400 }}>{fmt(s.data)}</b> · {s.nome}
                        {s.mod === "musc" && <div style={{ color: "var(--cinza)", fontSize: 13 }}>{s.itens.map((i) => `${ex(i.exId).nome}: ${i.series.map((r) => `${r.carga}×${r.reps}`).join(", ")}`).join(" · ")}</div>}
                        {s.mod === "natacao" && <div style={{ color: "var(--cinza)", fontSize: 13 }}>{s.itens.map((i) => `${ex(i.exId).nome} ${i.metros} m em ${i.tempoMin} min`).join(" · ")}</div>}
                        {s.mod === "pilates" && s.obs && <div style={{ color: "var(--cinza)", fontSize: 13, fontStyle: "italic" }}>{s.obs}</div>}
                      </td>
                      <td>{resumo(s)}</td>
                    </tr>
                  ))}
                  {!doMes.length && <tr><td className="vazio">Nenhum treino neste mês ainda.</td></tr>}
                </tbody></table>
              </div>
              <button className="btn" onClick={() => avisar("Na versão final, o PDF é gerado aqui")}>Gerar PDF do mês</button>
              <button className="btn q" onClick={() => avisar("Na versão final, exporta tudo em planilha")}>Exportar tudo em planilha</button>
            </>)}
          </div>
        </>
      )}

      {detalhe && (
        <div className="fundo" onClick={() => setDetalhe(null)}>
          <div className="folha" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <Pict cat={detalhe.cat} cor={MOD[detalhe.mod].cor} tam={44} />
              <div style={{ flex: 1 }}><div className="sub" style={{ color: MOD[detalhe.mod].cor, fontStyle: "normal", marginTop: 0 }}>{detalhe.cat}</div><h1 style={{ fontSize: 24 }}>{detalhe.nome}</h1></div>
            </div>
            <div className="video"><div className="play" /><small>Vídeo da execução correta · espaço reservado no protótipo</small></div>
            <div style={{ fontSize: 15, color: "var(--cinza)", lineHeight: 1.5, fontStyle: "italic" }}>Na versão final, esta ficha mostra a foto do movimento, o vídeo e suas próprias anotações sobre o exercício.</div>
            {detalhe.mod === "musc" && ultimaSerie(detalhe.id) && <div className="li" style={{ marginTop: 12 }}><span className="t">Seu último registro<small>{fmt(ultimaSerie(detalhe.id).data)}</small></span><b>{ultimaSerie(detalhe.id).carga} kg × {ultimaSerie(detalhe.id).reps}</b></div>}
            <button className="btn q" onClick={() => setDetalhe(null)}>Fechar</button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      <nav className="nav"><div>
        {[["hoje", "Início"], ["treinos", "Treinos"], ["biblioteca", "Biblioteca"], ["historico", "Histórico"], ["exportar", "Exportar"]].map(([k, l]) => (
          <button key={k} className={aba === k ? "on" : ""} onClick={() => { setAba(k); setAtiva(null); setBusca(""); setConfirmar(null); }}><Icone k={k} />{l}</button>
        ))}
      </div></nav>
    </div>
  );
}
