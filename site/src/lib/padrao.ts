import type { ChaveBloco, Dados, TipoItem } from "./esquema";
import { proximoSabado, somarDias } from "./datas";

/**
 * O texto com que o site nasce. Tudo aqui é ponto de partida: a equipe troca
 * pelo próprio site, sem mexer neste arquivo. Onde não havia como saber a
 * informação (endereço, telefone, redes), o campo começa vazio e simplesmente
 * não aparece para o visitante até alguém preencher.
 */

export const BLOCOS_PADRAO: Record<ChaveBloco, Dados> = {
  "site.aviso": { texto: "", link: "" },
  "inicio.capa": {
    titulo: "Chazit Hanoar São Paulo",
    subtitulo: "Movimento juvenil judaico, sionista, educativo, apartidário e continental.",
    textoBotao: "Quero participar",
    linkBotao: "/contato",
    imagem: "",
  },
  "inicio.chamada": {
    titulo: "Vem pra Chazit!",
    texto:
      "Toda criança e todo jovem são bem-vindos. Fale com a gente para conhecer uma peulá, trazer um amigo ou matricular sua filha ou seu filho.",
    textoBotao: "Falar com a gente",
    linkBotao: "/contato",
  },
  "chazit.quemSomos": {
    titulo: "Quem somos",
    texto:
      "A **Chazit Hanoar** é um movimento juvenil judaico, sionista, educativo, apartidário e continental.\n\n" +
      "Toda semana, chanichim de várias idades se encontram em peulot preparadas por madrichim, jovens que já passaram pelo movimento e hoje educam os mais novos. Nas peulot, nos machanot e nos seminários, a gente brinca, discute, cria e aprende junto.\n\n" +
      "Acreditamos que a educação não formal forma pessoas mais autônomas, críticas e comprometidas com a comunidade judaica, com Israel e com a sociedade em que vivem.",
    imagem: "",
  },
  "chazit.historia": {
    titulo: "Nossa história",
    texto:
      "Conte aqui a história da Chazit Hanoar em São Paulo: quando começou, quem fundou, os momentos marcantes e as gerações que passaram pelo movimento.",
    imagem: "",
  },
  "shichvot.intro": {
    titulo: "Shichvot",
    texto:
      "Os chanichim se dividem em shichvot, grupos por idade. Cada shichvá tem seus madrichim e uma programação pensada para a sua faixa etária.",
  },
  "contato.info": {
    endereco: "",
    horario: "",
    whatsapp: "",
    email: "",
    instagram: "",
    facebook: "",
    youtube: "",
  },
  "contato.apoie": {
    titulo: "Apoie a Chazit",
    texto: "",
    pix: "",
    link: "",
  },
};

/** Os itens da primeira abertura, com datas contadas a partir de `hoje`. */
export function itensIniciais(hoje: string): { tipo: TipoItem; dados: Dados }[] {
  const sabado = proximoSabado(hoje);
  return [
    { tipo: "pilar", dados: { titulo: "Judaico", cor: "amarelo", texto: "Vivemos o judaísmo como cultura, história e identidade: nas festas, nas tradições e nas perguntas que ele nos faz." } },
    { tipo: "pilar", dados: { titulo: "Sionista", cor: "rosa", texto: "Israel faz parte de quem somos. Conhecemos, discutimos e construímos a nossa ligação com o Estado de Israel." } },
    { tipo: "pilar", dados: { titulo: "Educativo", cor: "verde", texto: "Somos uma escola fora da escola: jovens educando jovens, com autonomia, responsabilidade e muita criatividade." } },
    { tipo: "pilar", dados: { titulo: "Apartidário", cor: "turquesa", texto: "Formamos pessoas que pensam por conta própria. Discutimos política sem ligação com partido nenhum." } },
    { tipo: "pilar", dados: { titulo: "Continental", cor: "celeste", texto: "Fazemos parte de um movimento presente em vários países da América Latina." } },

    { tipo: "shichva", dados: { nome: "Pequenos", idade: "7 a 9 anos", cor: "amarelo", texto: "O primeiro contato com o movimento: muita brincadeira, amizade e as primeiras peulot." } },
    { tipo: "shichva", dados: { nome: "Médios", idade: "10 a 12 anos", cor: "rosa", texto: "Os chanichim começam a discutir temas maiores e a viver os primeiros machanot longe de casa." } },
    { tipo: "shichva", dados: { nome: "Grandes", idade: "13 a 14 anos", cor: "verde", texto: "Mais autonomia, mais debate e mais responsabilidade dentro do grupo." } },
    { tipo: "shichva", dados: { nome: "Bogrim", idade: "15 a 17 anos", cor: "celeste", texto: "Os mais velhos se preparam para ser madrichim e assumir tafkidim no movimento." } },

    { tipo: "evento", dados: { titulo: "Peulá de sábado", data: sabado, hora: "14:00", local: "", texto: "Peulot para todas as shichvot. Traga um amigo!", linkInscricao: "" } },
    { tipo: "evento", dados: { titulo: "Machané", data: somarDias(sabado, 42), hora: "", local: "", texto: "Troque este texto pelas datas, o local e o jeito de se inscrever.", linkInscricao: "" } },

    { tipo: "noticia", dados: { titulo: "Nosso site novo está no ar!", data: hoje, resumo: "Agora é aqui que você acompanha a agenda, as notícias e as fotos da Chazit Hanoar São Paulo.", texto: "Agora é aqui que você acompanha a agenda, as notícias e as fotos da Chazit Hanoar São Paulo.\n\nFique de olho na agenda para não perder nenhuma peulá.", imagem: "" } },
  ];
}
