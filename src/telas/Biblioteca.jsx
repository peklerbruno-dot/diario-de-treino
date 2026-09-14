import { useState } from "react";
import { db } from "../dados/bd.js";
import { MOD, ORDEM, GRUPOS, norm, agoraISO } from "../dados/constantes.js";
import { Pict } from "../componentes/Pict.jsx";

export default function Biblioteca({ exercicios, setDetalhe, avisar }) {
  const [bib, setBib] = useState("musc");
  const [busca, setBusca] = useState("");
  const [novoEx, setNovoEx] = useState({ nome: "", cat: "Peito" });

  // Sem reordenar: a ordem dentro de cada grupo é a da lista do protótipo.
  const lista = exercicios.filter(
    (e) => e.mod === bib && (!busca || norm(e.nome).includes(norm(busca)) || norm(e.cat).includes(norm(busca)))
  );
  const cats = bib === "musc" ? GRUPOS : [...new Set(lista.map((e) => e.cat))];

  const adicionar = async () => {
    await db.exercicios.add({ nome: novoEx.nome.trim(), cat: novoEx.cat, mod: bib, criadoEm: agoraISO() });
    setNovoEx({ ...novoEx, nome: "" });
    avisar("Exercício adicionado");
  };

  return (
    <>
      <div className="top">
        <h1>Biblioteca</h1>
        <div className="sub">{exercicios.filter((e) => e.mod === bib).length} exercícios · toque para ver a execução</div>
      </div>
      <div className="sec">
        <div className="busca">
          <div className="seg" style={{ marginBottom: 10 }}>
            {ORDEM.map((m) => (
              <button
                key={m}
                className={bib === m ? "on" : ""}
                onClick={() => {
                  setBib(m);
                  setNovoEx({ nome: "", cat: m === "musc" ? "Peito" : "" });
                }}
              >
                {MOD[m].nome}
              </button>
            ))}
          </div>
          <input placeholder="Buscar por nome ou músculo" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>

        {cats.map((c) => {
          const doGrupo = lista.filter((e) => e.cat === c);
          if (!doGrupo.length) return null;
          return (
            <div key={c}>
              <h2 className="grupo" style={{ "--c": MOD[bib].cor, borderBottomColor: MOD[bib].cor, marginTop: 18 }}>{c}</h2>
              {doGrupo.map((e) => (
                <button key={e.id} className="lin" onClick={() => setDetalhe(e)}>
                  <Pict cat={e.cat} cor={MOD[bib].cor} tam={26} />
                  <span className="t">{e.nome}</span>
                  <span className="ver">ver</span>
                </button>
              ))}
            </div>
          );
        })}
        {!lista.length && <div className="vazio">Nenhum exercício com esse nome. Adicione abaixo.</div>}

        <h2>Novo exercício</h2>
        <div className="campo" style={{ marginTop: 10 }}>
          Nome
          <input value={novoEx.nome} onChange={(e) => setNovoEx({ ...novoEx, nome: e.target.value })} />
        </div>
        <div className="campo">
          {MOD[bib].campo}
          {bib === "musc" ? (
            <select value={novoEx.cat} onChange={(e) => setNovoEx({ ...novoEx, cat: e.target.value })}>
              {GRUPOS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          ) : (
            <input value={novoEx.cat} onChange={(e) => setNovoEx({ ...novoEx, cat: e.target.value })} />
          )}
        </div>
        <button className="btn" disabled={!novoEx.nome.trim() || !novoEx.cat.trim()} onClick={adicionar}>
          Adicionar à biblioteca
        </button>
      </div>
    </>
  );
}
