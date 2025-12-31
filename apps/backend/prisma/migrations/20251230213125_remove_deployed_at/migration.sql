/*
  Warnings:

  - You are about to drop the column `deployed_at` on the `monthly_contributions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "monthly_contributions" DROP COLUMN "deployed_at";

-- AlterTable
ALTER TABLE "portfolios" ADD COLUMN     "equal_weights_json" TEXT;
