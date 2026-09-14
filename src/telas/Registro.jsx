import { MOD } from "../dados/constantes.js";
import { fmt, ultimaSerieDe } from "../dados/calculos.js";
import { Pict } from "../componentes/Pict.jsx";

export default function Registro({ ativa, setAtiva, sessoes, ex, setDetalhe, salvar, Excluir, limparConfirmacao }) {
  const ultimaSerie = (exId, antesDe) => ultimaSerieDe(sessoes, exId, antesDe);
  // Toda edição mexe numa cópia: o estado só troca no setAtiva.
  const mexer = (f) => {
    const c = structuredClone(ativa);
    f(c);
    setAtiva(c);
  };

  return (
    <div className="sec" style={{ paddingTop: 24 }}>
      <div className="sub" style={{ color: MOD[ativa.mod].cor, fontStyle: "normal" }}>{MOD[ativa.mod].nome}</div>
      <h1>{ativa.nome}</h1>
      {ativa.origem === "texto" && (
        <div className="aviso">
          Foi isso que entendi do seu texto. Corrija o que precisar e salve.
          {ativa.novos?.length > 0 && (
            <>
              <br />
              {ativa.novos.length === 1 ? "Não achei " : "Não achei "}
              {ativa.novos.join(", ")} na biblioteca — {ativa.novos.length === 1 ? "ele entra" : "eles entram"} ao
              salvar, e dá para arrumar o grupo muscular depois na Biblioteca.
            </>
          )}
          {ativa.naoEntendi?.length > 0 && (
            <>
              <br />
              Não entendi: “{ativa.naoEntendi.join("”, “")}”.
            </>
          )}
        </div>
      )}
      {ativa.id && <div className="aviso">Treino já registrado. O que você mudar aqui substitui o que estava salvo.</div>}
      <div className="campo" style={{ marginTop: 14 }}>
        Data
        <input type="date" value={ativa.data} onChange={(e) => setAtiva({ ...ativa, data: e.target.value })} />
      </div>

      {ativa.mod === "musc" &&
        ativa.itens.map((it, ii) => {
          const e = it.exId ? ex(it.exId) : { nome: it.nome, cat: it.cat, mod: "musc", novo: true };
          const u = it.exId ? ultimaSerie(it.exId, ativa.data) : null;
          return (
            <div className="exer" key={ii}>
              <div className="cabx">
                <button className="cab" onClick={() => !e.novo && setDetalhe(e)}>
                  <Pict cat={e.cat} cor={MOD.musc.cor} tam={30} />
                  <span style={{ flex: 1 }}>
                    <h3>{e.nome}</h3>
                    <span className="ult">
                      {e.novo
                        ? "Novo — entra na biblioteca ao salvar"
                        : u
                          ? `Último treino (${fmt(u.data)}): ${u.carga} kg × ${u.reps}`
                          : "Primeira vez registrando"}
                    </span>
                  </span>
                </button>
                <Excluir
                  id={`it-${ii}`}
                  onConfirm={() => {
                    mexer((c) => c.itens.splice(ii, 1));
                    limparConfirmacao();
                  }}
                />
              </div>
              <div className="serie" style={{ marginBottom: 4, fontStyle: "italic" }}>
                <span />
                <span>kg</span>
                <span>reps</span>
                <span />
              </div>
              {it.series.map((r, ri) => (
                <div className="serie" key={ri}>
                  <span>{ri + 1}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={r.carga}
                    onChange={(ev) => mexer((c) => (c.itens[ii].series[ri].carga = ev.target.value))}
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={r.reps}
                    onChange={(ev) => mexer((c) => (c.itens[ii].series[ri].reps = ev.target.value))}
                  />
                  <button
                    className="x"
                    aria-label="Remover série"
                    onClick={() => mexer((c) => c.itens[ii].series.splice(ri, 1))}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                className="mais"
                onClick={() =>
                  mexer((c) => {
                    const last = c.itens[ii].series.at(-1) || { carga: "", reps: "" };
                    c.itens[ii].series.push({ ...last });
                  })
                }
              >
                Adicionar série
              </button>
            </div>
          );
        })}

      {ativa.mod === "natacao" &&
        ativa.itens.map((it, ii) => (
          <div className="exer" key={ii}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ flex: 1 }}>{it.exId ? ex(it.exId).nome : it.nome}</h3>
              <Excluir
                id={`it-${ii}`}
                onConfirm={() => {
                  mexer((c) => c.itens.splice(ii, 1));
                  limparConfirmacao();
                }}
              />
            </div>
            <div className="serie" style={{ gridTemplateColumns: "1fr 1fr", fontStyle: "italic" }}>
              <label>
                Metros
                <input
                  type="number"
                  inputMode="numeric"
                  value={it.metros}
                  onChange={(e) => mexer((c) => (c.itens[ii].metros = e.target.value))}
                />
              </label>
              <label>
                Minutos
                <input
                  type="number"
                  inputMode="numeric"
                  value={it.tempoMin}
                  onChange={(e) => mexer((c) => (c.itens[ii].tempoMin = e.target.value))}
                />
              </label>
            </div>
          </div>
        ))}

      {ativa.mod === "pilates" && (
        <>
          <div className="campo">
            Duração (min)
            <input
              type="number"
              inputMode="numeric"
              value={ativa.duracaoMin}
              onChange={(e) => setAtiva({ ...ativa, duracaoMin: e.target.value })}
            />
          </div>
          <div className="campo">
            Observações
            <textarea
              rows={3}
              value={ativa.obs}
              onChange={(e) => setAtiva({ ...ativa, obs: e.target.value })}
              placeholder="O que trabalhou, como se sentiu"
            />
          </div>
        </>
      )}

      <button className="btn" onClick={salvar}>{ativa.id ? "Salvar alterações" : "Salvar treino"}</button>
      <button className="btn q" onClick={() => setAtiva(null)}>{ativa.id ? "Cancelar" : "Descartar"}</button>
    </div>
  );
}
