#!/usr/bin/env ts-node

/**
 * Daily metrics refresh job
 * Recalculates portfolio metrics (equity, exposure, leverage, etc.)
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, "../../apps/backend/.env") });

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

  // Calculate total exposure
  let totalExposure = 0;
  for (const pos of positions) {
    const currentPrice = priceMap.get(pos.assetId) || pos.avgPrice;
    totalExposure += pos.quantity * currentPrice;
  }

  // Get latest metrics to calculate base equity and borrowedAmount
  // Include metadataJson to check which contributions have already been processed
  const latestMetric = await prisma.metricsTimeseries.findFirst({
    where: { portfolioId },
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      equity: true,
      exposure: true,
      borrowedAmount: true,
      createdAt: true,
      metadataJson: true, // Include to check already processed contributions
    },
  });

  // Get all contributions for this portfolio up to today
  const dateEnd = new Date(date);
  dateEnd.setUTCHours(23, 59, 59, 999);

  const allContributions = await prisma.monthlyContribution.findMany({
    where: {
      portfolioId,
      contributedAt: {
        lte: dateEnd,
      },
    },
    orderBy: {
      contributedAt: "asc",
    },
  });

  // Determine which contributions have already been processed
  // by checking the metadataJson.contributions array in the existing metric
  let processedContributionIds: Set<string> = new Set();

  if (latestMetric?.metadataJson) {
    try {
      const existingMetadata = JSON.parse(latestMetric.metadataJson);
      if (
        existingMetadata.contributions &&
        Array.isArray(existingMetadata.contributions)
      ) {
        // Extract contribution IDs that have already been processed
        existingMetadata.contributions.forEach((c: any) => {
          if (c.contributionId) {
            processedContributionIds.add(c.contributionId);
          }
        });
      }
    } catch (e) {
      // If parsing fails, assume no contributions have been processed
    }
  }

  // Filter to find contributions NOT yet processed
  const newContributions = allContributions.filter(
    (c) => !processedContributionIds.has(c.id)
  );

  let contributionsSinceLastMetric = newContributions.reduce(
    (sum: number, c: any) => sum + c.amount,
    0
  );

  if (newContributions.length > 0) {
    console.log(
      `[metrics-refresh] Found ${
        newContributions.length
      } NEW contribution(s) (not yet processed) totaling $${contributionsSinceLastMetric.toFixed(
        2
      )}`
    );
    newContributions.forEach((c: any) => {
      console.log(
        `  - $${c.amount.toFixed(2)} (id: ${
          c.id
        }, contributedAt: ${c.contributedAt.toISOString()})`
      );
    });
  } else if (latestMetric) {
    console.log(
      `[metrics-refresh] No new contributions (${processedContributionIds.size} already processed)`
    );
  } else if (allContributions.length > 0) {
    // No previous metrics but we have contributions - process all of them
    contributionsSinceLastMetric = allContributions.reduce(
      (sum, c) => sum + c.amount,
      0
    );
    console.log(
      `[metrics-refresh] Found ${
        allContributions.length
      } contribution(s) (no previous metrics) totaling $${contributionsSinceLastMetric.toFixed(
        2
      )}`
    );
  }

  // Use contributions since last metric (more comprehensive)
  const totalContributionsToAdd = contributionsSinceLastMetric;

  // Calculate equity and borrowedAmount
  // IMPORTANT:
  // - Equity changes with price movements AND contributions
  // - borrowedAmount should remain constant unless there's a rebalance
  // - When there's a contribution, equity increases but borrowedAmount stays the same
  let equity: number;
  let borrowedAmount: number | null = null;

  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
  });

  if (!portfolio) return null;

  if (
    latestMetric &&
    latestMetric.borrowedAmount !== null &&
    latestMetric.borrowedAmount >= 0 &&
    latestMetric.exposure > 0
  ) {
    // We have valid previous metrics with leverage
    // BUT: Validate that the previous metrics are mathematically correct
    // If borrowedAmount = 0 and leverage should be > 1, something is wrong
    const targetLeverage =
      portfolio.leverageTarget ||
      (portfolio.leverageMin + portfolio.leverageMax) / 2;

    // Recalculate borrowedAmount from scratch
    equity = totalExposure / targetLeverage + totalContributionsToAdd;
    borrowedAmount = totalExposure - (equity - totalContributionsToAdd);
  } else if (
    latestMetric &&
    latestMetric.equity > 0 &&
    latestMetric.exposure > 0 &&
    totalExposure > 0
  ) {
    // We have previous metrics but borrowedAmount might be 0 or null
    // First, validate that the previous equity is mathematically correct
    // If equity = exposure, that means leverage = 1, which is likely incorrect
    const previousLeverage = latestMetric.exposure / latestMetric.equity;
    const targetLeverage =
      portfolio.leverageTarget ||
      (portfolio.leverageMin + portfolio.leverageMax) / 2;
    const leverageDeviation =
      Math.abs(previousLeverage - targetLeverage) / targetLeverage;

    // If previous leverage is way off (more than 50% deviation), recalculate from scratch
    if (leverageDeviation > 0.5 || previousLeverage < 1.1) {
      console.log(
        `[metrics-refresh] ⚠️  Previous equity appears incorrect (leverage=${previousLeverage.toFixed(
          2
        )}, expected=${targetLeverage.toFixed(
          2
        )}). Recalculating from scratch...`
      );
      // Recalculate from leverage target
      equity = totalExposure / targetLeverage + totalContributionsToAdd;
      borrowedAmount = totalExposure - (equity - totalContributionsToAdd);
    } else {
      // Previous equity looks correct, use it to calculate borrowedAmount
      const previousBorrowedAmount =
        latestMetric.exposure - latestMetric.equity;
      if (previousBorrowedAmount >= 0) {
        borrowedAmount = previousBorrowedAmount;
        const equityFromPriceChanges = totalExposure - borrowedAmount;
        equity = equityFromPriceChanges + totalContributionsToAdd;
      } else {
        // Fallback: calculate from leverage target
        equity = totalExposure / targetLeverage + totalContributionsToAdd;
        borrowedAmount = totalExposure - (equity - totalContributionsToAdd);
      }
    }
  } else {
    // New portfolio or no previous metrics
    // For new portfolios, use initialCapital as base equity
    // Then calculate based on current exposure and leverage target
    const targetLeverage =
      portfolio.leverageTarget ||
      (portfolio.leverageMin + portfolio.leverageMax) / 2;

    if (totalExposure > 0) {
      // We have positions, calculate equity from exposure and leverage
      // equity = exposure / leverage
      equity = totalExposure / targetLeverage + totalContributionsToAdd;
      borrowedAmount = totalExposure - (equity - totalContributionsToAdd);
    } else {
      // No positions yet, use initialCapital as equity
      // This happens when portfolio is just created but positions haven't been set
      equity = (portfolio.initialCapital || 0) + totalContributionsToAdd;
      borrowedAmount = 0; // No borrowing if no exposure
    }

    console.log(
      `[metrics-refresh] New portfolio calculation: initialCapital=$${(
        portfolio.initialCapital || 0
      ).toFixed(2)}, exposure=$${totalExposure.toFixed(
        2
      )}, targetLeverage=${targetLeverage.toFixed(
        2
      )}, contributions_since_last_metric=$${totalContributionsToAdd.toFixed(
        2
      )}, final_equity=$${equity.toFixed(2)}`
    );
  }

  // Calculate current portfolio composition
  const composition = positions.map((pos) => {
    const currentPrice = priceMap.get(pos.assetId) || pos.avgPrice;
    const value = pos.quantity * currentPrice;
    const weight = totalExposure > 0 ? value / totalExposure : 0;

    return {
      symbol: pos.asset.symbol,
      name: pos.asset.name,
      weight,
      value,
      quantity: pos.quantity,
    };
  });

  return {
    equity,
    exposure: totalExposure,
    leverage: equity > 0 ? totalExposure / equity : 0,
    borrowedAmount,
    sharpe: null, // Calculate later with returns history
    drawdown: null, // Calculate later with equity history
    composition, // Include composition in metrics
    newContributions, // Include new contributions to add to metadata
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

    // Get today's date in UTC to avoid timezone issues
    // This ensures consistency with other services (positions.service.ts, rebalance.service.ts)
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    let successCount = 0;
    let skipCount = 0;

    for (const portfolio of portfolios) {
      console.log(`Calculating metrics for portfolio ${portfolio.name}...`);

      const metrics = await calculateMetrics(portfolio.id, today);

      if (metrics) {
        // Check if there's an existing entry to preserve existing metadata
        const existingMetric = await prisma.metricsTimeseries.findFirst({
          where: {
            portfolioId: portfolio.id,
            date: today,
          },
        });

        // Build metadata with composition
        // IMPORTANT: Preserve arrays (contributions, rebalances, manualUpdates) from existing metadata
        const metadata: any = {
          source: "metrics-refresh",
          updatedAt: new Date().toISOString(),
        };

        // Always include current composition
        if (metrics.composition) {
          metadata.composition = metrics.composition;
        }

        // Preserve other metadata fields from existing entry if they exist
        // IMPORTANT: If user manually updated today, preserve their equity value
        let shouldPreserveEquity = false;
        let preservedEquity = 0;
        let preservedBorrowedAmount = 0;

        if (existingMetric && existingMetric.metadataJson) {
          try {
            const existingMetadata = JSON.parse(existingMetric.metadataJson);

            // CRITICAL: Preserve all arrays (contributions, rebalances, manualUpdates)
            // These arrays contain historical information that should never be lost
            if (
              existingMetadata.contributions &&
              Array.isArray(existingMetadata.contributions)
            ) {
              metadata.contributions = existingMetadata.contributions;

              // IMPORTANT: If source is "contribution", the equity already includes the contribution
              // We should preserve it and only adjust for price changes
              if (existingMetadata.source === "contribution") {
                // Calculate how much exposure changed due to price movements
                const exposureChange =
                  metrics.exposure - existingMetric.exposure;

                // The equity change due to prices is the same as exposure change
                // (borrowedAmount stays constant, so equity absorbs the price change)
                const equityWithPriceChange =
                  existingMetric.equity + exposureChange;

                shouldPreserveEquity = true;
                preservedEquity = equityWithPriceChange;
                preservedBorrowedAmount = existingMetric.borrowedAmount || 0;
                metadata.source = "contribution";
                metadata.refreshedAt = new Date().toISOString();

                console.log(
                  `[metrics-refresh] Preserving contribution equity: $${existingMetric.equity.toFixed(
                    2
                  )} + price_change=$${exposureChange.toFixed(
                    2
                  )} = $${preservedEquity.toFixed(2)}`
                );
              }
            }
            if (
              existingMetadata.rebalances &&
              Array.isArray(existingMetadata.rebalances)
            ) {
              metadata.rebalances = existingMetadata.rebalances;

              // If source is "rebalance", preserve equity and adjust for price changes
              if (
                existingMetadata.source === "rebalance" &&
                !shouldPreserveEquity
              ) {
                const exposureChange =
                  metrics.exposure - existingMetric.exposure;
                const equityWithPriceChange =
                  existingMetric.equity + exposureChange;

                shouldPreserveEquity = true;
                preservedEquity = equityWithPriceChange;
                preservedBorrowedAmount = existingMetric.borrowedAmount || 0;
                metadata.source = "rebalance";
                metadata.refreshedAt = new Date().toISOString();

                console.log(
                  `[metrics-refresh] Preserving rebalance equity: $${existingMetric.equity.toFixed(
                    2
                  )} + price_change=$${exposureChange.toFixed(
                    2
                  )} = $${preservedEquity.toFixed(2)}`
                );
              }
            }
            if (
              existingMetadata.manualUpdates &&
              Array.isArray(existingMetadata.manualUpdates)
            ) {
              metadata.manualUpdates = existingMetadata.manualUpdates;

              // Check if there's a recent manual update that should preserve equity
              if (!shouldPreserveEquity) {
                const exposureChange =
                  metrics.exposure - existingMetric.exposure;
                const equityWithPriceChange =
                  existingMetric.equity + exposureChange;

                shouldPreserveEquity = true;
                preservedEquity = equityWithPriceChange;
                preservedBorrowedAmount = existingMetric.borrowedAmount || 0;
                metadata.source = existingMetadata.source || "manual_update";
                metadata.refreshedAt = new Date().toISOString();

                console.log(
                  `[metrics-refresh] Preserving manual equity: $${existingMetric.equity.toFixed(
                    2
                  )} + price_change=$${exposureChange.toFixed(
                    2
                  )} = $${preservedEquity.toFixed(2)}`
                );
              }
            }

            // Preserve source if it's not metrics-refresh (to indicate original source)
            if (
              existingMetadata.source &&
              existingMetadata.source !== "metrics-refresh"
            ) {
              metadata.source = existingMetadata.source;
            }
          } catch (e) {
            // If parsing fails, just use new metadata
            console.warn(
              `[metrics-refresh] Failed to parse existing metadata: ${e}`
            );
          }
        }

        // Add new contributions to the metadata.contributions array
        // This ensures they won't be counted again in future refreshes
        if (metrics.newContributions && metrics.newContributions.length > 0) {
          if (!metadata.contributions) {
            metadata.contributions = [];
          }
          for (const contrib of metrics.newContributions) {
            metadata.contributions.push({
              contributionId: contrib.id,
              amount: contrib.amount,
              note: contrib.note,
              contributedAt: contrib.contributedAt.toISOString(),
              processedAt: new Date().toISOString(),
            });
          }
          console.log(
            `[metrics-refresh] Added ${metrics.newContributions.length} contribution(s) to metadata`
          );
        }

        // Determine final values - preserve user's equity if they set it manually today
        const finalEquity = shouldPreserveEquity
          ? preservedEquity
          : metrics.equity;
        const finalBorrowedAmount = shouldPreserveEquity
          ? preservedBorrowedAmount
          : metrics.borrowedAmount;
        const finalLeverage =
          finalEquity > 0 ? metrics.exposure / finalEquity : 0;

        // Update monthly metrics (metrics_timeseries)
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
            equity: finalEquity,
            exposure: metrics.exposure,
            leverage: finalLeverage,
            borrowedAmount: finalBorrowedAmount,
            sharpe: metrics.sharpe,
            drawdown: metrics.drawdown,
            metadataJson: JSON.stringify(metadata),
          },
          update: {
            // Only update exposure (prices changed), preserve equity if manually set
            equity: finalEquity,
            exposure: metrics.exposure,
            leverage: finalLeverage,
            borrowedAmount: finalBorrowedAmount,
            sharpe: metrics.sharpe,
            drawdown: metrics.drawdown,
            metadataJson: JSON.stringify(metadata),
          },
        });

        // Also update daily metrics (daily_metrics) for daily tracking
        const dailyMetricClient = (prisma as any).dailyMetric;
        if (dailyMetricClient) {
          // Calculate peak equity from history
          const allMetrics = await prisma.metricsTimeseries.findMany({
            where: { portfolioId: portfolio.id },
            select: { equity: true },
          });

          let peakEquity = finalEquity;
          for (const m of allMetrics) {
            if (m.equity > peakEquity) {
              peakEquity = m.equity;
            }
          }

          // Calculate margin ratio using final equity
          const marginRatio =
            finalEquity > 0 ? finalEquity / metrics.exposure : 1;

          await dailyMetricClient.upsert({
            where: {
              portfolioId_date: {
                portfolioId: portfolio.id,
                date: today,
              },
            },
            create: {
              portfolioId: portfolio.id,
              date: today,
              equity: finalEquity,
              exposure: metrics.exposure,
              leverage: finalLeverage,
              peakEquity,
              marginRatio,
              borrowedAmount: finalBorrowedAmount,
            },
            update: {
              equity: finalEquity,
              exposure: metrics.exposure,
              leverage: finalLeverage,
              peakEquity,
              marginRatio,
              borrowedAmount: finalBorrowedAmount,
            },
          });
        }

        console.log(
          `✅ ${portfolio.name}: Equity=$${finalEquity.toFixed(
            2
          )}, Leverage=${finalLeverage.toFixed(2)}x${
            shouldPreserveEquity ? " (preserved from manual update)" : ""
          }`
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
