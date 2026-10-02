import { temGemini } from "@/lib/leitor";
import { TelaNovoPlano } from "./tela";

export default function NovoPlano() {
  return <TelaNovoPlano temGemini={temGemini()} />;
}
