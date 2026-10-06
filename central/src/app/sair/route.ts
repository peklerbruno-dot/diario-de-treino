import { redirect } from "next/navigation";
import { sair } from "@/lib/auth";

export async function GET() {
  await sair();
  redirect("/entrar");
}
