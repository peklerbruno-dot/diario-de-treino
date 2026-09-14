import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, semear } from "./dados/bd.js";
import { hojeISO, agoraISO } from "./dados/constantes.js";
import { ultimaSerieDe, nnum } from "./dados/calculos.js";
import { interpretar } from "./dados/interpretar.js";
import { Icone, Lixo } from "./componentes/Icone.jsx";
import Ficha from "./componentes/Ficha.jsx";
import Inicio from "./telas/Inicio.jsx";
import Registro from "./telas/Registro.jsx";
import Treinos from "./telas/Treinos.jsx";
import Biblioteca from "./telas/Biblioteca.jsx";
// Os gráficos carregam à parte: é o pedaço mais pesado e não é preciso na abertura.
const Historico = lazy(() => import("./telas/Historico.jsx"));
import Exportar from "./telas/Exportar.jsx";

const ABAS = [
  ["hoje", "Início"],
  ["treinos", "Treinos"],
  ["biblioteca", "Biblioteca"],
  ["historico", "Histórico"],
  ["exportar", "Exportar"],
];

export default function App() {
  const [aba, setAba] = useState("hoje");
  const [ativa, setAtiva] = useState(null); // sessão sendo registrada
  const [detalheId, setDetalheId] = useState(null);
  const [fichaGerenciavel, setFichaGerenciavel] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmar, setConfirmar] = useState(null);
  const [erroBanco, setErroBanco] = useState(null);

  // Primeira abertura no aparelho: carrega a biblioteca de exercícios.
  useEffect(() => {
    semear().catch((e) => setErroBanco(e.message || String(e)));
  }, []);

  const exercicios = useLiveQuery(() => db.exercicios.toArray(), [], null);
  const treinos = useLiveQuery(() => db.treinos.toArray(), [], null);
  const sessoes = useLiveQuery(() => db.sessoes.toArray(), [], null);

  const avisar = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 2200);
  };

  const Excluir = useCallback(
    ({ id, onConfirm }) =>
      confirmar === id ? (
        <button className="x conf" onClick={(ev) => { ev.stopPropagation(); onConfirm(); }}>Excluir</button>
      ) : (
        <button
          className="x"
          aria-label="Excluir"
          onClick={(ev) => {
            ev.stopPropagation();
            setConfirmar(id);
          }}
        >
          <Lixo />
        </button>
      ),
    [confirmar]
  );

  if (erroBanco) {
    return (
      <div className="dt">
        <div className="top"><h1>Diário de treino</h1></div>
        <div className="sec">
          <div className="vazio">Não consegui abrir o banco de dados neste aparelho: {erroBanco}</div>
        </div>
      </div>
    );
  }

  if (!exercicios || !treinos || !sessoes) {
    return (
      <div className="dt">
        <div className="top"><h1>Diário de treino</h1><div className="sub">abrindo o caderno…</div></div>
      </div>
    );
  }

  const ex = (id) => exercicios.find((e) => e.id === id) || { nome: "?", cat: "", mod: "musc" };

  /** Monta a sessão a partir de um modelo, já com as cargas do último treino. */
  const iniciar = (t) => {
    const base = { data: hojeISO(), mod: t.mod, nome: t.nome, treinoId: t.id };
    if (t.mod === "musc") {
      base.itens = t.itens.map((i) => {
        const u = ultimaSerieDe(sessoes, i.exId);
        return {
          exId: i.exId,
          series: Array.from({ length: i.series || 1 }, () => ({ carga: u ? u.carga : "", reps: i.reps ?? "" })),
        };
      });
    } else if (t.mod === "natacao") {
      base.itens = t.itens.map((i) => ({ exId: i.exId, metros: "", tempoMin: "" }));
    } else {
      base.duracaoMin = "";
      base.obs = "";
    }
    setAtiva(base);
    setAba("hoje");
  };

  /** Lê o treino escrito à mão e abre a tela de conferência. */
  const escrever = (texto) => {
    const rascunho = interpretar(texto, exercicios, hojeISO());
    if (!rascunho) {
      avisar("Não entendi. Tente: supino 3 de 10 com 50 kg");
      return false;
    }
    setAtiva(rascunho);
    return true;
  };

  /** Abre uma sessão já registrada para conferir e corrigir. */
  const abrirSessao = (s) => {
    const c = structuredClone(s);
    if (c.mod === "pilates") {
      c.duracaoMin = c.duracaoMin ?? "";
      c.obs = c.obs ?? "";
    }
    setAtiva(c);
  };

  /** Grava a sessão. Exercícios que ainda não existem (vindos de texto livre) entram na biblioteca. */
  const salvarSessao = async () => {
    const s = structuredClone(ativa);
    const editando = Boolean(s.id);
    delete s.origem;
    delete s.naoEntendi;
    delete s.novos;
    await db.transaction("rw", db.exercicios, db.sessoes, async () => {
      for (const it of s.itens || []) {
        if (!it.exId && it.nome) {
          it.exId = await db.exercicios.add({
            mod: s.mod,
            nome: it.nome,
            cat: it.cat || (s.mod === "musc" ? "Abdômen" : "Estilo"),
            criadoEm: agoraISO(),
          });
        }
        delete it.nome;
        delete it.cat;
      }
      // Campos numéricos viram número na hora de gravar; vazio conta como zero.
      if (s.mod === "musc") {
        s.itens = (s.itens || []).map((it) => ({
          exId: it.exId,
          series: (it.series || []).map((r) => ({ carga: nnum(r.carga), reps: nnum(r.reps) })),
        }));
      } else if (s.mod === "natacao") {
        s.itens = (s.itens || []).map((it) => ({ exId: it.exId, metros: nnum(it.metros), tempoMin: nnum(it.tempoMin) }));
      } else {
        delete s.itens;
        s.duracaoMin = nnum(s.duracaoMin);
        s.obs = s.obs || "";
      }
      if (editando) {
        await db.sessoes.put(s);
      } else {
        s.criadoEm = agoraISO();
        await db.sessoes.add(s);
      }
    });
    setAtiva(null);
    setAba(editando ? "historico" : "hoje");
    avisar(editando ? "Treino atualizado" : "Treino salvo");
  };

  const comuns = {
    exercicios,
    treinos,
    sessoes,
    ex,
    avisar,
    Excluir,
    limparConfirmacao: () => setConfirmar(null),
    setDetalhe: (e, gerenciar = false) => {
      setDetalheId(e.id);
      setFichaGerenciavel(gerenciar);
    },
  };
  const detalhe = detalheId ? exercicios.find((e) => e.id === detalheId) : null;

  return (
    <div className="dt" onClick={() => confirmar && setConfirmar(null)}>
      {aba === "hoje" && !ativa && <Inicio {...comuns} iniciar={iniciar} escrever={escrever} />}

      {ativa && <Registro {...comuns} ativa={ativa} setAtiva={setAtiva} salvar={salvarSessao} />}

      {aba === "treinos" && !ativa && <Treinos {...comuns} />}
      {aba === "biblioteca" && !ativa && <Biblioteca {...comuns} />}
      {aba === "historico" && !ativa && (
        <Suspense fallback={<div className="top"><h1>Histórico</h1><div className="sub">desenhando os gráficos…</div></div>}>
          <Historico {...comuns} abrirSessao={abrirSessao} />
        </Suspense>
      )}
      {aba === "exportar" && !ativa && <Exportar {...comuns} />}

      {detalhe && (
        <Ficha
          exercicio={detalhe}
          sessoes={sessoes}
          gerenciar={fichaGerenciavel}
          avisar={avisar}
          fechar={() => setDetalheId(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}

      <nav className="nav">
        <div>
          {ABAS.map(([k, l]) => (
            <button
              key={k}
              className={aba === k ? "on" : ""}
              onClick={() => {
                setAba(k);
                setAtiva(null);
                setConfirmar(null);
                setDetalheId(null);
              }}
            >
              <Icone k={k} />
              {l}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
