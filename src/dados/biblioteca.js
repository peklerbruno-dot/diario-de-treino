// Biblioteca inicial: mesma lista do protótipo (diario-de-treino-v5.jsx).
// Os ids são fixos para que um backup antigo continue apontando para os mesmos exercícios.
export const GRUPOS = ["Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Quadríceps", "Posterior", "Glúteos", "Panturrilha", "Abdômen"];
const MUSC = [
  ["Supino reto com barra", "Peito"], ["Supino inclinado com barra", "Peito"], ["Supino declinado", "Peito"], ["Supino reto com halteres", "Peito"], ["Supino inclinado com halteres", "Peito"], ["Crucifixo com halteres", "Peito"], ["Crossover no cabo", "Peito"], ["Peck deck", "Peito"], ["Flexão de braço", "Peito"],
  ["Puxada frontal", "Costas"], ["Puxada supinada", "Costas"], ["Barra fixa", "Costas"], ["Remada curvada com barra", "Costas"], ["Remada baixa no cabo", "Costas"], ["Remada unilateral com halter", "Costas"], ["Remada cavalinho", "Costas"], ["Remada na máquina", "Costas"], ["Pulldown com braços estendidos", "Costas"], ["Levantamento terra", "Costas"],
  ["Desenvolvimento com halteres", "Ombros"], ["Desenvolvimento militar com barra", "Ombros"], ["Desenvolvimento na máquina", "Ombros"], ["Elevação lateral", "Ombros"], ["Elevação frontal", "Ombros"], ["Crucifixo inverso", "Ombros"], ["Face pull", "Ombros"], ["Encolhimento com halteres", "Ombros"],
  ["Rosca direta com barra", "Bíceps"], ["Rosca alternada", "Bíceps"], ["Rosca martelo", "Bíceps"], ["Rosca Scott", "Bíceps"], ["Rosca concentrada", "Bíceps"], ["Rosca no cabo", "Bíceps"],
  ["Tríceps pulley", "Tríceps"], ["Tríceps corda", "Tríceps"], ["Tríceps testa", "Tríceps"], ["Tríceps francês", "Tríceps"], ["Mergulho no banco", "Tríceps"], ["Tríceps coice", "Tríceps"],
  ["Agachamento livre", "Quadríceps"], ["Agachamento no smith", "Quadríceps"], ["Agachamento frontal", "Quadríceps"], ["Leg press 45°", "Quadríceps"], ["Hack machine", "Quadríceps"], ["Cadeira extensora", "Quadríceps"], ["Afundo com halteres", "Quadríceps"], ["Agachamento búlgaro", "Quadríceps"], ["Passada", "Quadríceps"],
  ["Stiff", "Posterior"], ["Levantamento terra romeno", "Posterior"], ["Mesa flexora", "Posterior"], ["Cadeira flexora", "Posterior"], ["Bom dia", "Posterior"],
  ["Elevação pélvica", "Glúteos"], ["Abdução na máquina", "Glúteos"], ["Coice no cabo", "Glúteos"], ["Cadeira abdutora", "Glúteos"],
  ["Panturrilha em pé", "Panturrilha"], ["Panturrilha sentado", "Panturrilha"], ["Panturrilha no leg press", "Panturrilha"],
  ["Abdominal supra", "Abdômen"], ["Abdominal infra", "Abdômen"], ["Prancha", "Abdômen"], ["Elevação de pernas na barra", "Abdômen"], ["Abdominal na polia", "Abdômen"], ["Abdominal oblíquo", "Abdômen"], ["Roda abdominal", "Abdômen"],
];

export const bibliotecaInicial = [
  ...MUSC.map(([nome, cat], i) => ({ id: i + 1, mod: "musc", nome, cat })),
  { id: 201, mod: "pilates", nome: "Reformer", cat: "Aparelho" }, { id: 202, mod: "pilates", nome: "Cadillac", cat: "Aparelho" }, { id: 203, mod: "pilates", nome: "Chair", cat: "Aparelho" }, { id: 204, mod: "pilates", nome: "Mat", cat: "Solo" },
  { id: 301, mod: "natacao", nome: "Crawl", cat: "Estilo" }, { id: 302, mod: "natacao", nome: "Costas", cat: "Estilo" }, { id: 303, mod: "natacao", nome: "Peito", cat: "Estilo" }, { id: 304, mod: "natacao", nome: "Borboleta", cat: "Estilo" }, { id: 305, mod: "natacao", nome: "Pernada com prancha", cat: "Educativo" },
];
