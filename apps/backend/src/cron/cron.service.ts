import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

/**
 * Service that executes cron job scripts
 * Imports and runs the logic from infra/scripts
 */
@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Execute price ingestion job
   * Fetches latest prices from Yahoo Finance and stores in database
   */
  async runPriceIngestion(): Promise<{ success: boolean; message: string }> {
    this.logger.log("🔄 Starting price ingestion...");

    try {
      // Import the ingestion logic dynamically
      const priceIngestionModule = await import("../../../../infra/scripts/price-ingestion");
      
      // The script creates its own PrismaClient, but we can still use it
      // The script will handle its own connection/disconnection
      await priceIngestionModule.ingestPrices();

      this.logger.log("✅ Price ingestion completed successfully");
      return {
        success: true,
        message: "Price ingestion completed successfully",
      };
    } catch (error) {
      this.logger.error("❌ Price ingestion failed:", error);
      throw error;
    }
  }

  /**
   * Execute metrics refresh job
   * Recalculates portfolio metrics (equity, exposure, leverage)
   */
  async runMetricsRefresh(): Promise<{ success: boolean; message: string }> {
    this.logger.log("🔄 Starting metrics refresh...");

    try {
      // Import the refresh logic dynamically
      const metricsRefreshModule = await import("../../../../infra/scripts/metrics-refresh");
      
      await metricsRefreshModule.refreshMetrics();

      this.logger.log("✅ Metrics refresh completed successfully");
      return {
        success: true,
        message: "Metrics refresh completed successfully",
      };
    } catch (error) {
      this.logger.error("❌ Metrics refresh failed:", error);
      throw error;
    }
  }

  /**
   * Execute daily check job
   * Generates recommendations and alerts
   */
  async runDailyCheck(): Promise<{ success: boolean; message: string }> {
    this.logger.log("🔍 Starting daily check...");

    try {
      // Import the daily check logic dynamically
      const dailyCheckModule = await import("../../../../infra/scripts/daily-check");
      
      const result = await dailyCheckModule.runDailyCheck();

      this.logger.log(
        `✅ Daily check completed: ${result.portfoliosChecked} portfolios, ${result.alertsGenerated} alerts`
      );
      return {
        success: true,
        message: `Daily check completed: ${result.portfoliosChecked} portfolios checked, ${result.alertsGenerated} alerts generated`,
      };
    } catch (error) {
      this.logger.error("❌ Daily check failed:", error);
      throw error;
    }
  }
}

