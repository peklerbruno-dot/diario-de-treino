import { useState } from "react";
import { MOD, ORDEM, hojeISO } from "../dados/constantes.js";
import { fmt, fmtLonga, mesNome, volume, metros, semanaDe, mesAnteriorDe, ultimaSerieDe } from "../dados/calculos.js";

export default function Inicio({ exercicios, treinos, sessoes, iniciar, escrever }) {
  const [modo, setModo] = useState("escolher");
  const [texto, setTexto] = useState("");
  const hoje = hojeISO();
  const mesAtual = hoje.slice(0, 7);
  const mesAnt = mesAnteriorDe(mesAtual);
  const ultimaSerie = (exId, antesDe) => ultimaSerieDe(sessoes, exId, antesDe);

  const doMes = sessoes.filter((s) => s.data.startsWith(mesAtual)).sort((a, b) => a.data.localeCompare(b.data));
  const doMesAnt = sessoes.filter((s) => s.data.startsWith(mesAnt));
  const volMes = doMes.filter((s) => s.mod === "musc").reduce((t, s) => t + volume(s), 0);
  const volMesAnt = doMesAnt.filter((s) => s.mod === "musc").reduce((t, s) => t + volume(s), 0);
  const mMes = doMes.reduce((t, s) => t + metros(s), 0);
  const minPil = doMes.filter((s) => s.mod === "pilates").reduce((t, s) => t + (Number(s.duracaoMin) || 0), 0);

  // Semanas seguidas treinando, contando para trás a partir desta semana.
  const semanasComTreino = new Set(sessoes.map((s) => semanaDe(s.data)));
  let sequencia = 0;
  {
    let w = semanaDe(hoje);
    while (semanasComTreino.has(w)) {
      sequencia++;
      const d = new Date(w + "T12:00:00");
      d.setDate(d.getDate() - 7);
      w = d.toISOString().slice(0, 10);
    }
  }

  // Exercícios cuja carga máxima do último registro superou a do anterior.
  const recordes = exercicios
    .filter((e) => e.mod === "musc")
    .map((e) => {
      const ult = ultimaSerie(e.id);
      if (!ult) return null;
      const ant = ultimaSerie(e.id, ult.data);
      if (!ant) return null;
      return Number(ult.carga) > Number(ant.carga) ? { ex: e, de: ant.carga, para: ult.carga, data: ult.data } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 3);

  const semana = Array.from({ length: 7 }, (_, k) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + k);
    const iso = d.toISOString().slice(0, 10);
    return { iso, n: d.getDate(), ss: sessoes.filter((s) => s.data === iso) };
  });

  const vazio = sessoes.length === 0;

  return (
    <>
      <div className="top">
        <h1>Diário de treino</h1>
        <div className="sub">{fmtLonga(hoje)}</div>
      </div>
      <div className="sec">
        <div className="g">{doMes.length}</div>
        <div className="l">
          {doMes.length === 1 ? "treino" : "treinos"} em {mesNome(mesAtual)}
          {doMesAnt.length ? ` · ${doMesAnt.length} em ${mesNome(mesAnt)}` : ""}
          {doMes.length > 0 && (
            <>
              <br />
              {ORDEM.map((m) => {
                const n = doMes.filter((s) => s.mod === m).length;
                return n ? (
                  <span key={m} style={{ "--c": MOD[m].cor }}>
                    {n} {MOD[m].nome.toLowerCase()}
                  </span>
                ) : null;
              })}
            </>
          )}
        </div>

        <div className="semana">
          {semana.map((d) => (
            <div key={d.iso} className={d.iso === hoje ? "h" : ""}>
              <div className="bs">
                {d.ss.map((s) => (
                  <i key={s.id} style={{ background: MOD[s.mod].cor }} />
                ))}
              </div>
              {["D", "S", "T", "Q", "Q", "S", "S"][new Date(d.iso + "T12:00:00").getDay()]}
            </div>
          ))}
        </div>

        <div className="stats">
          <div className="stat">
            <b>{sequencia}</b>
            <span>{sequencia === 1 ? "semana seguida" : "semanas seguidas"}</span>
          </div>
          <div className="stat">
            <b>
              {volMes >= 10000
                ? `${(volMes / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t`
                : `${volMes.toLocaleString("pt-BR")} kg`}
            </b>
            <span>levantados no mês</span>
            {volMesAnt > 0 && (
              <em style={{ color: volMes >= volMesAnt ? MOD.pilates.cor : MOD.musc.cor }}>
                {volMes >= volMesAnt ? "+" : ""}
                {Math.round(((volMes - volMesAnt) / volMesAnt) * 100)}% sobre {mesNome(mesAnt)}
              </em>
            )}
          </div>
          <div className="stat">
            <b>{mMes.toLocaleString("pt-BR")}</b>
            <span>metros nadados</span>
          </div>
          <div className="stat">
            <b>{minPil}</b>
            <span>min de pilates</span>
          </div>
        </div>

        {vazio && (
          <div className="vazio">
            Seu diário começa hoje. Monte seus treinos na aba Treinos e registre cada um aqui; os números acima vão se
            preenchendo.
          </div>
        )}

        {recordes.length > 0 && (
          <>
            <h2>Recordes recentes</h2>
            {recordes.map((r) => (
              <div className="li" key={r.ex.id}>
                <span className="t">
                  {r.ex.nome}
                  <small>{fmt(r.data)}</small>
                </span>
                <b>
                  {r.de} → {r.para} kg
                </b>
              </div>
            ))}
          </>
        )}

        <h2>Registrar treino</h2>
        <div className="seg" style={{ marginTop: 10 }}>
          <button className={modo === "escolher" ? "on" : ""} onClick={() => setModo("escolher")}>
            Meus treinos
          </button>
          <button className={modo === "escrever" ? "on" : ""} onClick={() => setModo("escrever")}>
            Escrever o que fiz
          </button>
        </div>

        {modo === "escolher" &&
          (treinos.length ? (
            treinos.map((t) => (
              <button key={t.id} className="lin" onClick={() => iniciar(t)}>
                <span className="mk" style={{ "--c": MOD[t.mod].cor }} />
                <span className="t">
                  {t.nome}
                  <small>
                    {MOD[t.mod].nome} · {t.itens.length} {t.itens.length === 1 ? "exercício" : "exercícios"}
                  </small>
                </span>
              </button>
            ))
          ) : (
            <div className="vazio">
              Os treinos que você montar na aba Treinos aparecem aqui. Toque em um para registrar.
            </div>
          ))}

        {modo === "escrever" && (
          <>
            <textarea
              rows={4}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={
                "hoje fiz supino reto 3 de 10 com 50 kg, puxada 3x12 com 45 e rosca direta 3 de 10 com 20" +
                "\n\nnadei 1000 m de crawl em 25 min\n\npilates de aparelho, 50 min"
              }
            />
            <button className="btn" disabled={!texto.trim()} onClick={() => escrever(texto) && setTexto("")}>
              Converter em treino
            </button>
            <div className="sub" style={{ marginTop: 8 }}>Você confere tudo antes de salvar.</div>
          </>
        )}
      </div>
    </>
  );
}
