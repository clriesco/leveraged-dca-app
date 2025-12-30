-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_currency" TEXT NOT NULL DEFAULT 'USD',
    "leverage_min" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "leverage_max" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "initial_capital" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "metadata_json" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_positions" (
    "id" TEXT NOT NULL,
    "portfolio_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "avg_price" DOUBLE PRECISION NOT NULL,
    "exposure_usd" DOUBLE PRECISION NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_contributions" (
    "id" TEXT NOT NULL,
    "portfolio_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "contributed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "monthly_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rebalance_events" (
    "id" TEXT NOT NULL,
    "portfolio_id" TEXT NOT NULL,
    "contribution_id" TEXT,
    "triggered_by" TEXT NOT NULL,
    "target_leverage" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rebalance_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rebalance_positions" (
    "id" TEXT NOT NULL,
    "rebalance_event_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "target_weight" DOUBLE PRECISION NOT NULL,
    "target_usd" DOUBLE PRECISION NOT NULL,
    "delta_quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "rebalance_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_prices" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "adj_close" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'yfinance',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrics_timeseries" (
    "id" TEXT NOT NULL,
    "portfolio_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "equity" DOUBLE PRECISION NOT NULL,
    "exposure" DOUBLE PRECISION NOT NULL,
    "leverage" DOUBLE PRECISION NOT NULL,
    "sharpe" DOUBLE PRECISION,
    "drawdown" DOUBLE PRECISION,
    "metadata_json" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metrics_timeseries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_metrics" (
    "id" TEXT NOT NULL,
    "portfolio_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "equity" DOUBLE PRECISION NOT NULL,
    "exposure" DOUBLE PRECISION NOT NULL,
    "leverage" DOUBLE PRECISION NOT NULL,
    "drawdown" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "assets_symbol_key" ON "assets"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_positions_portfolio_id_asset_id_key" ON "portfolio_positions"("portfolio_id", "asset_id");

-- CreateIndex
CREATE INDEX "asset_prices_asset_id_date_idx" ON "asset_prices"("asset_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "asset_prices_asset_id_date_key" ON "asset_prices"("asset_id", "date");

-- CreateIndex
CREATE INDEX "metrics_timeseries_portfolio_id_date_idx" ON "metrics_timeseries"("portfolio_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "metrics_timeseries_portfolio_id_date_key" ON "metrics_timeseries"("portfolio_id", "date");

-- CreateIndex
CREATE INDEX "daily_metrics_portfolio_id_date_idx" ON "daily_metrics"("portfolio_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_metrics_portfolio_id_date_key" ON "daily_metrics"("portfolio_id", "date");

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_positions" ADD CONSTRAINT "portfolio_positions_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_positions" ADD CONSTRAINT "portfolio_positions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_contributions" ADD CONSTRAINT "monthly_contributions_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rebalance_events" ADD CONSTRAINT "rebalance_events_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rebalance_events" ADD CONSTRAINT "rebalance_events_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "monthly_contributions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rebalance_positions" ADD CONSTRAINT "rebalance_positions_rebalance_event_id_fkey" FOREIGN KEY ("rebalance_event_id") REFERENCES "rebalance_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rebalance_positions" ADD CONSTRAINT "rebalance_positions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_prices" ADD CONSTRAINT "asset_prices_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metrics_timeseries" ADD CONSTRAINT "metrics_timeseries_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
