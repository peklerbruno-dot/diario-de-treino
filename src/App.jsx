import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, semear } from "./dados/bd.js";
import { MOD, ORDEM } from "./dados/constantes.js";

const hojeISO = () => new Date().toISOString().slice(0, 10);
const fmtLonga = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

// Na tela de início do iPhone o app abre fora do Safari, em janela própria.
const naTelaDeInicio = () =>
  window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;

export default function App() {
  const [instalado, setInstalado] = useState(naTelaDeInicio);
  const [offline, setOffline] = useState(() => Boolean(navigator.serviceWorker?.controller));
  const [erroBanco, setErroBanco] = useState(null);

  // Primeira abertura no aparelho: carrega a biblioteca de exercícios.
  useEffect(() => {
    semear().catch((e) => setErroBanco(e.message || String(e)));
  }, []);

  const porModalidade = useLiveQuery(async () => {
    const contas = {};
    for (const m of ORDEM) contas[m] = await db.exercicios.where("mod").equals(m).count();
    return contas;
  }, []);
  const totalExercicios = useLiveQuery(() => db.exercicios.count(), []);
  const totalTreinos = useLiveQuery(() => db.treinos.count(), []);
  const totalSessoes = useLiveQuery(() => db.sessoes.count(), []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let ativo = true;
    // Na primeira visita o service worker ainda está instalando; avisa quando assumir o controle.
    navigator.serviceWorker.ready.then(() => ativo && setOffline(true));
    const aoTrocar = () => ativo && setOffline(true);
    navigator.serviceWorker.addEventListener("controllerchange", aoTrocar);
    return () => {
      ativo = false;
      navigator.serviceWorker.removeEventListener("controllerchange", aoTrocar);
    };
  }, []);

  useEffect(() => {
    const tela = window.matchMedia("(display-mode: standalone)");
    const aoMudar = () => setInstalado(naTelaDeInicio());
    tela.addEventListener("change", aoMudar);
    return () => tela.removeEventListener("change", aoMudar);
  }, []);

  const num = (n) => (n === undefined ? "…" : n.toLocaleString("pt-BR"));

  return (
    <div className="dt">
      <div className="top">
        <h1>Diário de treino</h1>
        <div className="sub">{fmtLonga(hojeISO())}</div>
      </div>

      <div className="sec">
        <p className="texto">
          Musculação, pilates e natação em um só caderno. Os dados ficam neste aparelho — sem conta, sem servidor.
        </p>

        <h2>Biblioteca</h2>
        <div className="li">
          <span>Exercícios</span>
          <em>{num(totalExercicios)}</em>
        </div>
        <div className="mods">
          {ORDEM.map((m) => (
            <span key={m} style={{ "--c": MOD[m].cor }}>
              {num(porModalidade?.[m])} {MOD[m].nome.toLowerCase()}
            </span>
          ))}
        </div>
        <div className="li" style={{ marginTop: 10 }}>
          <span>Modelos de treino</span>
          <em>{num(totalTreinos)}</em>
        </div>
        <div className="li">
          <span>Treinos registrados</span>
          <em>{num(totalSessoes)}</em>
        </div>

        {erroBanco && <p className="rodape">Não consegui abrir o banco de dados neste aparelho: {erroBanco}</p>}

        <h2>Instalação</h2>
        <div className="li">
          <span>Na tela de início</span>
          <em>{instalado ? "sim" : "ainda no Safari"}</em>
        </div>
        <div className="li">
          <span>Funciona offline</span>
          <em>{offline ? "sim" : "preparando…"}</em>
        </div>

        {!instalado && (
          <p className="rodape">
            No Safari do iPhone, toque em Compartilhar e escolha “Adicionar à Tela de Início”. O app passa a abrir em
            janela própria, sem barra de endereço.
          </p>
        )}
      </div>
    </div>
  );
}
