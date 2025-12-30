#!/usr/bin/env ts-node

/**
 * Daily metrics refresh job
 * Recalculates portfolio metrics (equity, exposure, leverage, etc.)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Calculate portfolio metrics for a given date
 */
async function calculateMetrics(portfolioId: string, date: Date) {
  // Get portfolio positions
  const positions = await prisma.portfolioPosition.findMany({
    where: { portfolioId },
    include: { asset: true },
  });

  if (positions.length === 0) {
    return null;
  }

  // Get latest prices for all assets
  const assetPrices = await Promise.all(
    positions.map(async (pos) => {
      const latestPrice = await prisma.assetPrice.findFirst({
        where: {
          assetId: pos.assetId,
          date: { lte: date },
        },
        orderBy: { date: "desc" },
      });
      return {
        assetId: pos.assetId,
        price: latestPrice?.close || pos.avgPrice,
      };
    })
  );

  const priceMap = new Map(assetPrices.map((p) => [p.assetId, p.price]));

  // Calculate total exposure and equity
  let totalExposure = 0;
  for (const pos of positions) {
    const currentPrice = priceMap.get(pos.assetId) || pos.avgPrice;
    totalExposure += pos.quantity * currentPrice;
  }

  // Get latest metrics to calculate borrowedAmount
  const latestMetric = await prisma.metricsTimeseries.findFirst({
    where: { portfolioId },
    orderBy: { date: "desc" },
  });

  // Calculate borrowedAmount: exposure - equity
  // If we have previous metrics, use the borrowedAmount from there
  // Otherwise, calculate equity from leverage and derive borrowedAmount
  let equity: number;
  let borrowedAmount: number | null = null;

  if (latestMetric && latestMetric.borrowedAmount !== null) {
    // Use previous borrowedAmount as reference, calculate equity
    // If exposure changed, adjust borrowedAmount proportionally
    const exposureChange = totalExposure - latestMetric.exposure;
    borrowedAmount = latestMetric.borrowedAmount + exposureChange;
    equity = totalExposure - borrowedAmount;
  } else {
    // Fallback: estimate equity from leverage
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio) return null;

    const targetLeverage = (portfolio.leverageMin + portfolio.leverageMax) / 2;
    equity = totalExposure / targetLeverage;
    borrowedAmount = totalExposure - equity;
  }

  return {
    equity,
    exposure: totalExposure,
    leverage: equity > 0 ? totalExposure / equity : 0,
    borrowedAmount,
    sharpe: null, // Calculate later with returns history
    drawdown: null, // Calculate later with equity history
  };
}

/**
 * Main metrics refresh function
 */
async function refreshMetrics() {
  console.log("🔄 Starting metrics refresh...");

  try {
    const portfolios = await prisma.portfolio.findMany();

    if (portfolios.length === 0) {
      console.log("⚠️  No portfolios found. Skipping refresh.");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let successCount = 0;
    let skipCount = 0;

    for (const portfolio of portfolios) {
      console.log(`Calculating metrics for portfolio ${portfolio.name}...`);

      const metrics = await calculateMetrics(portfolio.id, today);

      if (metrics) {
        await prisma.metricsTimeseries.upsert({
          where: {
            portfolioId_date: {
              portfolioId: portfolio.id,
              date: today,
            },
          },
          create: {
            portfolioId: portfolio.id,
            date: today,
            equity: metrics.equity,
            exposure: metrics.exposure,
            leverage: metrics.leverage,
            borrowedAmount: metrics.borrowedAmount,
            sharpe: metrics.sharpe,
            drawdown: metrics.drawdown,
          },
          update: {
            equity: metrics.equity,
            exposure: metrics.exposure,
            leverage: metrics.leverage,
            borrowedAmount: metrics.borrowedAmount,
            sharpe: metrics.sharpe,
            drawdown: metrics.drawdown,
          },
        });

        console.log(
          `✅ ${portfolio.name}: Equity=$${metrics.equity.toFixed(
            2
          )}, Leverage=${metrics.leverage.toFixed(2)}x`
        );
        successCount++;
      } else {
        console.log(`⚠️  ${portfolio.name}: No positions, skipping`);
        skipCount++;
      }
    }

    console.log("\n📊 Refresh Summary:");
    console.log(`   Success: ${successCount}`);
    console.log(`   Skipped: ${skipCount}`);
    console.log(`   Total: ${portfolios.length}`);
  } catch (error) {
    console.error("❌ Fatal error during metrics refresh:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  refreshMetrics()
    .then(() => {
      console.log("✅ Metrics refresh completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Metrics refresh failed:", error);
      process.exit(1);
    });
}

export { refreshMetrics };
