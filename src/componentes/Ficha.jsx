import { db } from "../dados/bd.js";
import { MOD } from "../dados/constantes.js";
import { fmt, ultimaSerieDe } from "../dados/calculos.js";
import { Pict } from "./Pict.jsx";

/** Ficha do exercício: pictograma, últimas cargas e as suas anotações. */
export default function Ficha({ exercicio, sessoes, fechar }) {
  const e = exercicio;

  // As três últimas vezes que esse exercício apareceu, com a série mais pesada de cada.
  const ultimas = [];
  let antes;
  for (let i = 0; i < 3; i++) {
    const u = ultimaSerieDe(sessoes, e.id, antes);
    if (!u) break;
    ultimas.push(u);
    antes = u.data;
  }

  return (
    <div className="fundo" onClick={fechar}>
      <div className="folha" onClick={(ev) => ev.stopPropagation()}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Pict cat={e.cat} cor={MOD[e.mod].cor} tam={44} />
          <div style={{ flex: 1 }}>
            <div className="sub" style={{ color: MOD[e.mod].cor, fontStyle: "normal", marginTop: 0 }}>{e.cat}</div>
            <h1 style={{ fontSize: 24 }}>{e.nome}</h1>
          </div>
        </div>

        <div className="video">
          <div className="play" />
          <small>Foto e vídeo da execução chegam na etapa 6</small>
        </div>

        {e.mod === "musc" && (
          <>
            <h2>Últimas cargas</h2>
            {ultimas.length ? (
              ultimas.map((u) => (
                <div className="li" key={u.data}>
                  <span className="t">{fmt(u.data)}</span>
                  <b>
                    {u.carga} kg × {u.reps}
                  </b>
                </div>
              ))
            ) : (
              <div className="vazio">Ainda não há registros deste exercício.</div>
            )}
          </>
        )}

        <h2>Minhas notas</h2>
        <textarea
          rows={3}
          value={e.notas || ""}
          placeholder="Ajuste do banco, pegada, o que o professor pediu"
          onChange={(ev) => db.exercicios.update(e.id, { notas: ev.target.value })}
        />

        <button className="btn q" onClick={fechar}>Fechar</button>
      </div>
    </div>
  );
}
