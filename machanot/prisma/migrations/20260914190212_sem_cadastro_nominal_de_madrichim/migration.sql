/*
  Warnings:

  - You are about to drop the column `receitaMadrichimRealCents` on the `Machane` table. All the data in the column will be lost.
  - You are about to drop the `Madrich` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PagamentoMadrich` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Madrich" DROP CONSTRAINT "Madrich_machaneId_fkey";

-- DropForeignKey
ALTER TABLE "PagamentoMadrich" DROP CONSTRAINT "PagamentoMadrich_madrichId_fkey";

-- AlterTable
ALTER TABLE "Machane" DROP COLUMN "receitaMadrichimRealCents";

-- DropTable
DROP TABLE "Madrich";

-- DropTable
DROP TABLE "PagamentoMadrich";
