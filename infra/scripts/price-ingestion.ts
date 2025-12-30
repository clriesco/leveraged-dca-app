#!/usr/bin/env ts-node

/**
 * Daily price ingestion job
 * Fetches latest prices from Yahoo Finance and stores in database
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketTime: number;
}

/**
 * Fetch current price from Yahoo Finance
 * @param symbol - Ticker symbol
 */
async function fetchPrice(symbol: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
    );
    const data = await response.json();

    if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
      return data.chart.result[0].meta.regularMarketPrice;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Main ingestion function
 */
async function ingestPrices() {
  console.log("🔄 Starting price ingestion...");

  try {
    // Get all assets from database
    const assets = await prisma.asset.findMany();

    if (assets.length === 0) {
      console.log("⚠️  No assets found in database. Skipping ingestion.");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let successCount = 0;
    let failCount = 0;

    for (const asset of assets) {
      console.log(`Fetching price for ${asset.symbol}...`);
      const price = await fetchPrice(asset.symbol);

      if (price !== null) {
        await prisma.assetPrice.upsert({
          where: {
            assetId_date: {
              assetId: asset.id,
              date: today,
            },
          },
          create: {
            assetId: asset.id,
            date: today,
            close: price,
            adjClose: price,
            source: "yahoo_finance",
          },
          update: {
            close: price,
            adjClose: price,
          },
        });
        console.log(`✅ ${asset.symbol}: $${price.toFixed(2)}`);
        successCount++;
      } else {
        console.log(`❌ ${asset.symbol}: Failed to fetch price`);
        failCount++;
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log("\n📊 Ingestion Summary:");
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    console.log(`   Total: ${assets.length}`);
  } catch (error) {
    console.error("❌ Fatal error during ingestion:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  ingestPrices()
    .then(() => {
      console.log("✅ Price ingestion completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Price ingestion failed:", error);
      process.exit(1);
    });
}

export { ingestPrices };
