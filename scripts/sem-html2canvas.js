// O jsPDF só carrega html2canvas e dompurify no método .html(), que este app não usa.
// Sem este atalho, os dois iriam para o cache do PWA sem necessidade (~230 kB).
export default function naoUsado() {
  throw new Error("Este app não usa jsPDF.html()");
}
