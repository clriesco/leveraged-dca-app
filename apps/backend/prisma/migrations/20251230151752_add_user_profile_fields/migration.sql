-- AlterTable
ALTER TABLE "users" ADD COLUMN     "full_name" TEXT,
ADD COLUMN     "notify_on_contributions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_on_leverage_alerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_on_rebalance" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_on_recommendations" BOOLEAN NOT NULL DEFAULT true;
