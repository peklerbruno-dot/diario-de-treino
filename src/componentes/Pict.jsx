// Pictograma do protótipo: a silhueta com o músculo trabalhado em destaque.
// Usado enquanto não houver foto do exercício (etapa 6 do briefing).
const REG = {
  Peito: [["r", 13, 14, 14, 7]], Costas: [["r", 13, 14, 14, 13]], Ombros: [["c", 10, 15, 3.6], ["c", 30, 15, 3.6]],
  Bíceps: [["r", 7, 15, 5, 9], ["r", 28, 15, 5, 9]], Tríceps: [["r", 7, 15, 5, 9], ["r", 28, 15, 5, 9]], Quadríceps: [["r", 14, 36, 5, 11], ["r", 21, 36, 5, 11]],
  Posterior: [["r", 14, 36, 5, 11], ["r", 21, 36, 5, 11]], Glúteos: [["r", 13, 32, 14, 5]], Panturrilha: [["r", 14, 47, 5, 9], ["r", 21, 47, 5, 9]],
  Abdômen: [["r", 15, 23, 10, 10]], Aparelho: [["r", 13, 20, 14, 14]], Solo: [["r", 13, 20, 14, 14]], Estilo: [["r", 13, 13, 14, 22]], Educativo: [["r", 14, 36, 5, 20], ["r", 21, 36, 5, 20]],
};
export function Pict({ cat, cor, tam = 44 }) {
  const regs = REG[cat] || [];
  return (
    <svg width={tam} height={tam * 1.4} viewBox="0 0 40 58" aria-hidden="true" style={{ flexShrink: 0 }}>
      <g fill="#DCD6C8"><circle cx="20" cy="7" r="5" /><rect x="13" y="13" width="14" height="22" rx="3" /><rect x="7" y="14" width="5" height="20" rx="2.5" /><rect x="28" y="14" width="5" height="20" rx="2.5" /><rect x="14" y="35" width="5" height="22" rx="2.5" /><rect x="21" y="35" width="5" height="22" rx="2.5" /></g>
      <g fill={cor}>{regs.map((s, i) => s[0] === "c" ? <circle key={i} cx={s[1]} cy={s[2]} r={s[3]} /> : <rect key={i} x={s[1]} y={s[2]} width={s[3]} height={s[4]} rx="2" />)}</g>
    </svg>
  );
}
