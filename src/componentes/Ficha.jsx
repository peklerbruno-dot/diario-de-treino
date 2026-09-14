import { useState } from "react";
import { db } from "../dados/bd.js";
import { MOD, GRUPOS, CATEGORIAS } from "../dados/constantes.js";
import { fmt, ultimaSerieDe } from "../dados/calculos.js";
import Figura from "./Figura.jsx";
import { fotosDe } from "../dados/fotos.js";

/** O id do vídeo, quando o link é do YouTube — aí dá para embutir o tocador. */
function idDoYouTube(url) {
  const m = String(url || "").match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/
  );
  return m ? m[1] : null;
}

/**
 * Ficha do exercício: pictograma, últimas cargas e as suas anotações.
 * Com `gerenciar`, também dá para renomear, trocar de categoria e tirar da biblioteca.
 */
export default function Ficha({ exercicio, sessoes, fechar, gerenciar, avisar }) {
  const e = exercicio;
  const [editando, setEditando] = useState(null);
  const [confirmando, setConfirmando] = useState(false);

  // As três últimas vezes que esse exercício apareceu, com a série mais pesada de cada.
  const ultimas = [];
  let antes;
  for (let i = 0; i < 3; i++) {
    const u = ultimaSerieDe(sessoes, e.id, antes);
    if (!u) break;
    ultimas.push(u);
    antes = u.data;
  }

  const fotos = fotosDe(e.id);
  const video = idDoYouTube(e.video);

  // Um exercício já usado não pode sumir: os treinos antigos ficariam sem nome.
  const usos = sessoes.filter((s) => (s.itens || []).some((i) => i.exId === e.id)).length;

  const salvarEdicao = async () => {
    await db.exercicios.update(e.id, { nome: editando.nome.trim(), cat: editando.cat.trim() });
    setEditando(null);
    avisar?.("Exercício alterado");
  };

  const tirarDaBiblioteca = async () => {
    if (usos) {
      await db.exercicios.update(e.id, { arquivado: true });
      avisar?.("Exercício arquivado");
    } else {
      await db.exercicios.delete(e.id);
      avisar?.("Exercício excluído");
    }
    fechar();
  };

  return (
    <div className="fundo" onClick={fechar}>
      <div className="folha" onClick={(ev) => ev.stopPropagation()}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Figura exercicio={e} cor={MOD[e.mod].cor} tam={44} />
          <div style={{ flex: 1 }}>
            <div className="sub" style={{ color: MOD[e.mod].cor, fontStyle: "normal", marginTop: 0 }}>
              {e.cat}
              {e.arquivado ? " · arquivado" : ""}
            </div>
            <h1 style={{ fontSize: 24 }}>{e.nome}</h1>
          </div>
        </div>

        {fotos.length > 0 && (
          <div className="fotos">
            {fotos.map((src, k) => (
              <figure key={src}>
                <img src={src} alt={`${e.nome} — ${k === 0 ? "início" : "fim"} do movimento`} loading="lazy" />
                <figcaption>{k === 0 ? "início" : "fim"}</figcaption>
              </figure>
            ))}
          </div>
        )}

        <h2>Vídeo</h2>
        {video ? (
          <iframe
            className="tocador"
            src={`https://www.youtube-nocookie.com/embed/${video}`}
            title={`Vídeo de ${e.nome}`}
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : e.video ? (
          <a className="btn q" href={e.video} target="_blank" rel="noreferrer" style={{ textAlign: "center" }}>
            Ver vídeo
          </a>
        ) : null}
        <input
          type="url"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="Cole o link do vídeo (YouTube ou outro)"
          value={e.video || ""}
          onChange={(ev) => db.exercicios.update(e.id, { video: ev.target.value.trim() })}
          style={{ marginTop: 8 }}
        />

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

        {gerenciar && !editando && (
          <>
            <h2>Este exercício</h2>
            <div className="acoes">
              <button className="mais" onClick={() => setEditando({ nome: e.nome, cat: e.cat })}>
                Editar nome e {MOD[e.mod].campo.toLowerCase()}
              </button>
              {e.arquivado ? (
                <button className="mais" onClick={() => db.exercicios.update(e.id, { arquivado: false })}>
                  Desarquivar
                </button>
              ) : confirmando ? (
                <button className="x conf" onClick={tirarDaBiblioteca}>
                  {usos ? "Arquivar" : "Excluir"}
                </button>
              ) : (
                <button className="mais" onClick={() => setConfirmando(true)}>
                  {usos ? "Arquivar" : "Excluir da biblioteca"}
                </button>
              )}
            </div>
            {usos > 0 && !e.arquivado && (
              <div className="sub">
                Aparece em {usos} {usos === 1 ? "treino registrado" : "treinos registrados"}, então não pode ser
                excluído — arquivar apenas o tira das listas.
              </div>
            )}
          </>
        )}

        {gerenciar && editando && (
          <>
            <h2>Editar exercício</h2>
            <div className="campo" style={{ marginTop: 10 }}>
              Nome
              <input value={editando.nome} onChange={(ev) => setEditando({ ...editando, nome: ev.target.value })} />
            </div>
            <div className="campo">
              {MOD[e.mod].campo}
              {e.mod === "musc" ? (
                <select value={editando.cat} onChange={(ev) => setEditando({ ...editando, cat: ev.target.value })}>
                  {GRUPOS.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={editando.cat}
                  onChange={(ev) => setEditando({ ...editando, cat: ev.target.value })}
                  list={`cats-${e.mod}`}
                />
              )}
            </div>
            <datalist id={`cats-${e.mod}`}>
              {(CATEGORIAS[e.mod] || []).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <button className="btn" disabled={!editando.nome.trim() || !editando.cat.trim()} onClick={salvarEdicao}>
              Salvar alterações
            </button>
            <button className="btn q" onClick={() => setEditando(null)}>Cancelar</button>
          </>
        )}

        {fotos.length > 0 && (
          <div className="credito">
            Fotos de execução do acervo público free-exercise-db (github.com/yuhonas/free-exercise-db).
          </div>
        )}

        {!editando && (
          <button className="btn q" onClick={fechar}>Fechar</button>
        )}
      </div>
    </div>
  );
}
