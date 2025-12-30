-- AlterTable
ALTER TABLE "daily_metrics" ADD COLUMN     "borrowed_amount" DOUBLE PRECISION,
ADD COLUMN     "margin_ratio" DOUBLE PRECISION,
ADD COLUMN     "peak_equity" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "metrics_timeseries" ADD COLUMN     "borrowed_amount" DOUBLE PRECISION,
ADD COLUMN     "margin_ratio" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "monthly_contributions" ADD COLUMN     "deployed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deployed_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "deployed_at" TIMESTAMP(3),
ADD COLUMN     "deployment_reason" TEXT;

-- AlterTable
ALTER TABLE "portfolios" ADD COLUMN     "contribution_day_of_month" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "contribution_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "drawdown_redeploy_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.12,
ADD COLUMN     "gradual_deploy_factor" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "leverage_target" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
ADD COLUMN     "maintenance_margin_ratio" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
ADD COLUMN     "max_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
ADD COLUMN     "mean_return_shrinkage" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
ADD COLUMN     "min_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
ADD COLUMN     "monthly_contribution" DOUBLE PRECISION,
ADD COLUMN     "risk_free_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
ADD COLUMN     "target_weights_json" TEXT,
ADD COLUMN     "use_dynamic_sharpe_rebalance" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "volatility_lookback_days" INTEGER NOT NULL DEFAULT 63,
ADD COLUMN     "volatility_redeploy_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
ADD COLUMN     "weight_deviation_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.05;
