import { fotosDe } from "../dados/fotos.js";
import { Pict } from "./Pict.jsx";

/**
 * A imagem do exercício nas listas: a foto de execução quando existe,
 * o pictograma do protótipo quando não.
 */
export default function Figura({ exercicio, cor, tam = 26 }) {
  const fotos = exercicio?.id ? fotosDe(exercicio.id) : [];
  if (!fotos.length) return <Pict cat={exercicio?.cat} cor={cor} tam={tam} />;
  return (
    <img
      className="foto"
      src={fotos[0]}
      alt=""
      width={tam}
      height={Math.round(tam * 1.4)}
      loading="lazy"
      decoding="async"
    />
  );
}
