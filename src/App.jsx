import { useEffect, useState } from "react";

const MOD = {
  musc: { nome: "Musculação", cor: "#9A5A22" },
  pilates: { nome: "Pilates", cor: "#4C7F5C" },
  natacao: { nome: "Natação", cor: "#33619C" },
};

const hojeISO = () => new Date().toISOString().slice(0, 10);
const fmtLonga = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

// Na tela de início do iPhone o app abre fora do Safari, em janela própria.
const naTelaDeInicio = () =>
  window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;

export default function App() {
  const [instalado, setInstalado] = useState(naTelaDeInicio);
  const [offline, setOffline] = useState(() => Boolean(navigator.serviceWorker?.controller));

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

        <div className="mods">
          {Object.entries(MOD).map(([k, m]) => (
            <span key={k} style={{ "--c": m.cor }}>
              {m.nome}
            </span>
          ))}
        </div>

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
