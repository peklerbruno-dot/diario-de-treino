import "server-only";
import { PrismaClient } from "@prisma/client";

/**
 * Um cliente só. Em desenvolvimento o Next recarrega o módulo a cada mudança de
 * arquivo, e sem este cuidado cada recarga abre mais uma conexão até o banco
 * recusar a próxima.
 */
const guardado = globalThis as unknown as { prisma?: PrismaClient };

export const bd =
  guardado.prisma ??
  new PrismaClient({
    // O nome da variável muda conforme o jeito de ligar o banco na Vercel.
    datasourceUrl: process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL,
  });

if (process.env.NODE_ENV !== "production") guardado.prisma = bd;
