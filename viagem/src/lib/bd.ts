import "server-only";
import { PrismaClient } from "@prisma/client";

/**
 * Um cliente só. Em desenvolvimento o Next recarrega o módulo a cada mudança de
 * arquivo, e sem este cuidado cada recarga abre mais uma conexão até o banco
 * recusar a próxima.
 */
const guardado = globalThis as unknown as { prisma?: PrismaClient };

export const bd = guardado.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") guardado.prisma = bd;
