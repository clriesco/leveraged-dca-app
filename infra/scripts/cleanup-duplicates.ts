#!/usr/bin/env ts-node

/**
 * Cleanup duplicate metrics entries
 * Removes duplicate entries in metrics_timeseries and daily_metrics
 * Keeps the most recent entry (based on created_at) for each portfolio_id + date combination
 *
 * Usage:
 *   npm run cleanup:duplicates
 *   or
 *   npx ts-node cleanup-duplicates.ts
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load .env from backend directory
dotenv.config({ path: resolve(__dirname, "../../apps/backend/.env") });

const prisma = new PrismaClient();

interface CleanupResult {
  table: string;
  duplicatesFound: number;
  duplicatesRemoved: number;
}

/**
 * Cleanup duplicates in metrics_timeseries
 */
async function cleanupMetricsTimeseries(): Promise<CleanupResult> {
  console.log("🔍 Checking for duplicates in metrics_timeseries...");

  // Find all duplicates using raw SQL
  const duplicates = await prisma.$queryRaw<
    Array<{ portfolio_id: string; date: Date; count: bigint }>
  >`
    SELECT portfolio_id, date, COUNT(*)::bigint as count
    FROM metrics_timeseries
    GROUP BY portfolio_id, date
    HAVING COUNT(*) > 1
  `;

  if (duplicates.length === 0) {
    console.log("✅ No duplicates found in metrics_timeseries");
    return { table: "metrics_timeseries", duplicatesFound: 0, duplicatesRemoved: 0 };
  }

  console.log(`⚠️  Found ${duplicates.length} duplicate date(s) in metrics_timeseries`);

  let totalRemoved = 0;

  for (const dup of duplicates) {
    // Get all entries for this portfolio_id + date combination
    const entries = await prisma.metricsTimeseries.findMany({
      where: {
        portfolioId: dup.portfolio_id,
        date: dup.date,
      },
      orderBy: {
        createdAt: "desc", // Most recent first
      },
    });

    if (entries.length > 1) {
      // Keep the first (most recent), delete the rest
      const toDelete = entries.slice(1);
      const idsToDelete = toDelete.map((e) => e.id);

      await prisma.metricsTimeseries.deleteMany({
        where: {
          id: { in: idsToDelete },
        },
      });

      totalRemoved += toDelete.length;
      console.log(
        `   Removed ${toDelete.length} duplicate(s) for portfolio ${dup.portfolio_id} on ${dup.date.toISOString().split("T")[0]}`
      );
    }
  }

  return {
    table: "metrics_timeseries",
    duplicatesFound: duplicates.reduce((sum, d) => sum + Number(d.count), 0),
    duplicatesRemoved: totalRemoved,
  };
}

/**
 * Cleanup duplicates in daily_metrics
 */
async function cleanupDailyMetrics(): Promise<CleanupResult> {
  console.log("🔍 Checking for duplicates in daily_metrics...");

  const dailyMetricClient = (prisma as any).dailyMetric;
  if (!dailyMetricClient) {
    console.log("⚠️  daily_metrics table not available, skipping");
    return { table: "daily_metrics", duplicatesFound: 0, duplicatesRemoved: 0 };
  }

  // Find all duplicates using raw query
  const duplicates = await prisma.$queryRaw<
    Array<{ portfolio_id: string; date: Date; count: bigint }>
  >`
    SELECT portfolio_id, date, COUNT(*)::bigint as count
    FROM daily_metrics
    GROUP BY portfolio_id, date
    HAVING COUNT(*) > 1
  `;

  if (duplicates.length === 0) {
    console.log("✅ No duplicates found in daily_metrics");
    return { table: "daily_metrics", duplicatesFound: 0, duplicatesRemoved: 0 };
  }

  console.log(`⚠️  Found ${duplicates.length} duplicate date(s) in daily_metrics`);

  let totalRemoved = 0;

  for (const dup of duplicates) {
    // Get all entries for this portfolio_id + date combination
    const entries = await dailyMetricClient.findMany({
      where: {
        portfolioId: dup.portfolio_id,
        date: dup.date,
      },
      orderBy: {
        createdAt: "desc", // Most recent first
      },
    });

    if (entries.length > 1) {
      // Keep the first (most recent), delete the rest
      const toDelete = entries.slice(1);
      const idsToDelete = toDelete.map((e: any) => e.id);

      await dailyMetricClient.deleteMany({
        where: {
          id: { in: idsToDelete },
        },
      });

      totalRemoved += toDelete.length;
      console.log(
        `   Removed ${toDelete.length} duplicate(s) for portfolio ${dup.portfolio_id} on ${dup.date.toISOString().split("T")[0]}`
      );
    }
  }

  return {
    table: "daily_metrics",
    duplicatesFound: duplicates.reduce((sum, d) => sum + Number(d.count), 0),
    duplicatesRemoved: totalRemoved,
  };
}

/**
 * Main cleanup function
 */
async function cleanupDuplicates(): Promise<void> {
  console.log("🧹 Starting duplicate cleanup...\n");

  try {
    const results: CleanupResult[] = [];

    // Cleanup metrics_timeseries
    const metricsResult = await cleanupMetricsTimeseries();
    results.push(metricsResult);

    console.log("");

    // Cleanup daily_metrics
    const dailyResult = await cleanupDailyMetrics();
    results.push(dailyResult);

    // Summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 Cleanup Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    for (const result of results) {
      if (result.duplicatesFound > 0) {
        console.log(
          `   ${result.table}: Found ${result.duplicatesFound}, Removed ${result.duplicatesRemoved}`
        );
      } else {
        console.log(`   ${result.table}: No duplicates found`);
      }
    }

    const totalRemoved = results.reduce((sum, r) => sum + r.duplicatesRemoved, 0);
    if (totalRemoved > 0) {
      console.log(`\n✅ Cleanup completed: ${totalRemoved} duplicate(s) removed`);
    } else {
      console.log(`\n✅ Cleanup completed: No duplicates found`);
    }
  } catch (error) {
    console.error("❌ Fatal error during cleanup:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  cleanupDuplicates()
    .then(() => {
      console.log("✅ Duplicate cleanup completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Duplicate cleanup failed:", error);
      process.exit(1);
    });
}

export { cleanupDuplicates };

