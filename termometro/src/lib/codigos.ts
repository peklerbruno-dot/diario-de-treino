import { randomInt } from "node:crypto";

/**
 * O código de acesso de quem chega por convite.
 *
 * É GERADO, e não escolhido, de propósito. Com cada um escolhendo o seu, dois
 * amigos podiam querer o mesmo — e o "esse já está em uso" contaria a um
 * deles o código do outro, que é a chave do dinheiro dele. Gerado, ele é único
 * por construção e forte o bastante para ninguém adivinhar: três palavras
 * curtas e quatro algarismos, uns 37 bits ("pera-azul-trem-4821"). Fácil de
 * ditar, de anotar e de digitar no iPhone.
 *
 * As palavras não têm acento nem cedilha: no teclado do celular, "maçã" vira
 * três toques a mais e uma chance de errar.
 */
const PALAVRAS = [
  "abelha", "abrir", "agua", "alto", "amigo", "amor", "anel", "ano", "areia", "arroz",
  "asa", "aula", "azul", "bala", "banco", "barco", "bebe", "bela", "bico", "bife",
  "bola", "bolo", "bom", "bota", "braco", "brisa", "bule", "burro", "cabo", "cafe",
  "caixa", "calmo", "cama", "campo", "cana", "canto", "capa", "carro", "casa", "caule",
  "cedo", "cego", "certo", "chave", "cheio", "chuva", "cidade", "cinco", "cinza", "claro",
  "cobra", "coco", "cofre", "copo", "cor", "corda", "corte", "couve", "cravo", "creme",
  "cubo", "dado", "dama", "dedo", "dente", "dia", "doce", "dois", "dono", "duna",
  "duro", "eixo", "estrela", "faca", "fada", "farol", "favo", "feira", "festa", "figo",
  "fio", "flor", "foca", "fogo", "folha", "fonte", "forte", "fruta", "fumo", "gado",
  "galo", "gato", "gelo", "gema", "giz", "gota", "grama", "grilo", "gruta", "guia",
  "hora", "ilha", "jogo", "junho", "lago", "lama", "lapis", "largo", "lata", "leao",
  "leite", "lento", "leve", "limao", "lindo", "linha", "liso", "livro", "lobo", "lousa",
  "lua", "lume", "luz", "macio", "madeira", "magro", "manga", "mapa", "mar", "massa",
  "mato", "meia", "mel", "mesa", "milho", "mina", "moeda", "mola", "monte", "morro",
  "mosca", "mundo", "muro", "nabo", "nariz", "navio", "neve", "ninho", "noite", "norte",
  "nove", "nuvem", "oca", "olho", "onda", "ouro", "ovo", "pai", "palha", "pano",
  "pao", "papel", "pato", "pavao", "paz", "pedra", "peixe", "pena", "pera", "perto",
  "pilha", "pino", "pipa", "pista", "planta", "pneu", "poco", "polvo", "ponte", "porta",
  "pote", "praia", "prato", "prego", "pulo", "quatro", "queijo", "rabo", "raio", "rampa",
  "rato", "rede", "rei", "remo", "rio", "rocha", "roda", "rosa", "roxo", "rua",
  "sabao", "saco", "sal", "salto", "sapo", "seda", "seis", "selo", "serra", "sete",
  "sino", "sol", "sopa", "sorte", "suco", "sul", "tampa", "tatu", "teia", "telha",
  "tempo", "terra", "tigre", "toca", "touro", "trem", "tres", "trigo", "tubo", "tucano",
  "uva", "vaca", "vale", "vaso", "vela", "verde", "vento", "verao", "vidro", "vila",
  "vinho", "viola", "voo", "zebra", "zinco", "zona",
  "bambu", "caju", "coral", "dique", "fusca", "gaita", "jade", "kiwi", "lima", "melao", "mirim", "nobre", "oliva", "pampa", "prata", "quilo", "rumo", "samba", "tenda", "vapor",
] as const;

export function gerarCodigo(): string {
  const palavra = () => PALAVRAS[randomInt(PALAVRAS.length)];
  const numero = String(randomInt(10000)).padStart(4, "0");
  return `${palavra()}-${palavra()}-${palavra()}-${numero}`;
}

/**
 * O código como ele é comparado: só letras minúsculas e algarismos.
 *
 * O iPhone põe maiúscula na primeira letra sozinho, e quem dita troca hífen
 * por espaço. "Pera azul trem 4821" e "pera-azul-trem-4821" são o mesmo código.
 */
export function normalizarCodigo(codigo: string): string {
  return codigo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Um identificador opaco para usuário e convite — sem ponto, que separa o cookie. */
export function novoIdentificador(tamanho = 22): string {
  const alfabeto = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < tamanho; i++) id += alfabeto[randomInt(alfabeto.length)];
  return id;
}

export const QUANTAS_PALAVRAS = PALAVRAS.length;
