import { useState } from "react";
import { db } from "../dados/bd.js";
import { MOD, ORDEM, norm, agoraISO } from "../dados/constantes.js";
import Figura from "../componentes/Figura.jsx";
import CampoNumero from "../componentes/CampoNumero.jsx";

export default function Treinos({ exercicios, treinos, ex, avisar, Excluir, limparConfirmacao }) {
  const [novoTr, setNovoTr] = useState(null);
  const [busca, setBusca] = useState("");

  const excluirTreino = async (id) => {
    await db.treinos.delete(id);
    limparConfirmacao();
    avisar("Modelo excluído");
  };

  // O mesmo formulário monta um treino novo e edita um existente (aí ele tem id).
  const salvarTreino = async () => {
    if (novoTr.id) {
      const { id, ...resto } = novoTr;
      await db.treinos.update(id, resto);
      avisar("Treino alterado");
    } else {
      await db.treinos.add({ ...novoTr, criadoEm: agoraISO() });
      avisar("Treino montado");
    }
    setNovoTr(null);
    setBusca("");
  };

  /** Sobe ou desce um exercício na ordem do treino. */
  const mover = (de, para) => {
    if (para < 0 || para >= novoTr.itens.length) return;
    const itens = [...novoTr.itens];
    [itens[de], itens[para]] = [itens[para], itens[de]];
    setNovoTr({ ...novoTr, itens });
  };

  const escolhiveis = exercicios.filter(
    (e) =>
      e.mod === novoTr?.mod &&
      !e.arquivado &&
      (!busca || norm(e.nome).includes(norm(busca)) || norm(e.cat).includes(norm(busca)))
  );

  return (
    <>
      <div className="top">
        <h1>Treinos</h1>
        <div className="sub">Modelos que você monta e repete</div>
      </div>
      <div className="sec">
        {!novoTr &&
          treinos.map((t) => (
            <div key={t.id} className="cabx">
              <button
                className="lin"
                onClick={() => {
                  setNovoTr(structuredClone(t));
                  setBusca("");
                }}
              >
                <span className="mk" style={{ "--c": MOD[t.mod].cor }} />
                <span className="t">
                  {t.nome}
                  <small>
                    {t.itens.map((i) => ex(i.exId).nome + (i.series ? ` ${i.series}×${i.reps}` : "")).join(" · ")}
                  </small>
                </span>
                <span className="ver">editar</span>
              </button>
              <Excluir id={`tr-${t.id}`} onConfirm={() => excluirTreino(t.id)} />
            </div>
          ))}

        {!novoTr && !treinos.length && (
          <div className="vazio" style={{ paddingTop: 30 }}>
            Um treino montado é uma lista de exercícios com séries e repetições planejadas — o "A", o "B", o dia de
            pilates. Depois de montado, registrar é só preencher as cargas, e um toque no treino abre para editar.
          </div>
        )}

        {!novoTr && (
          <button
            className="btn"
            onClick={() => {
              setNovoTr({ mod: "musc", nome: "", itens: [] });
              setBusca("");
            }}
          >
            Montar treino
          </button>
        )}

        {novoTr && (
          <div>
            <div className="seg" style={{ marginTop: 10 }}>
              {ORDEM.map((m) => (
                <button
                  key={m}
                  className={novoTr.mod === m ? "on" : ""}
                  onClick={() => novoTr.mod !== m && setNovoTr({ ...novoTr, mod: m, itens: [] })}
                >
                  {MOD[m].nome}
                </button>
              ))}
            </div>
            <div className="campo">
              Nome do treino
              <input
                value={novoTr.nome}
                onChange={(e) => setNovoTr({ ...novoTr, nome: e.target.value })}
                placeholder={novoTr.mod === "musc" ? "A · Peito e tríceps" : "Ex.: Natação longa"}
              />
            </div>

            {novoTr.itens.length > 1 && (
              <>
                <h2>Ordem dos exercícios</h2>
                <div className="sub">É nesta ordem que eles aparecem ao registrar o treino.</div>
                {novoTr.itens.map((i, k) => (
                  <div className="ordem" key={i.exId}>
                    <span className="n">{k + 1}</span>
                    <span className="t">{ex(i.exId).nome}</span>
                    <button className="x" aria-label="Subir" disabled={k === 0} onClick={() => mover(k, k - 1)}>
                      ↑
                    </button>
                    <button
                      className="x"
                      aria-label="Descer"
                      disabled={k === novoTr.itens.length - 1}
                      onClick={() => mover(k, k + 1)}
                    >
                      ↓
                    </button>
                  </div>
                ))}
              </>
            )}

            <h2>Exercícios {novoTr.itens.length ? `(${novoTr.itens.length})` : ""}</h2>
            <input
              placeholder="Buscar exercício"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ margin: "10px 0" }}
            />
            {escolhiveis.map((e) => {
              const it = novoTr.itens.find((i) => i.exId === e.id);
              return (
                <label key={e.id} className="chk">
                  <input
                    type="checkbox"
                    checked={!!it}
                    onChange={(ev) =>
                      setNovoTr({
                        ...novoTr,
                        itens: ev.target.checked
                          ? [...novoTr.itens, novoTr.mod === "musc" ? { exId: e.id, series: 3, reps: 10 } : { exId: e.id }]
                          : novoTr.itens.filter((i) => i.exId !== e.id),
                      })
                    }
                  />
                  <Figura exercicio={e} cor={MOD[e.mod].cor} tam={22} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {e.nome}
                    <span style={{ display: "block", fontSize: 12, color: "var(--cinza)", fontStyle: "italic" }}>{e.cat}</span>
                  </span>
                  {it && novoTr.mod === "musc" && (
                    <span style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 14 }}>
                      <CampoNumero
                        style={{ width: 46, padding: 6 }}
                        valor={it.series}
                        aoMudar={(v) =>
                          setNovoTr({
                            ...novoTr,
                            itens: novoTr.itens.map((i) => (i.exId === e.id ? { ...i, series: Number(v) || "" } : i)),
                          })
                        }
                        aria-label="Séries"
                      />
                      ×
                      <CampoNumero
                        style={{ width: 46, padding: 6 }}
                        valor={it.reps}
                        aoMudar={(v) =>
                          setNovoTr({
                            ...novoTr,
                            itens: novoTr.itens.map((i) => (i.exId === e.id ? { ...i, reps: Number(v) || "" } : i)),
                          })
                        }
                        aria-label="Repetições"
                      />
                    </span>
                  )}
                </label>
              );
            })}

            <button className="btn" disabled={!novoTr.nome || !novoTr.itens.length} onClick={salvarTreino}>
              {novoTr.id ? "Salvar alterações" : "Salvar treino"}
            </button>
            <button className="btn q" onClick={() => setNovoTr(null)}>Cancelar</button>
          </div>
        )}
      </div>
    </>
  );
}
