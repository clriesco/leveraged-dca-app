import { Controller, Get, Headers, Query, UnauthorizedException } from "@nestjs/common";

import { CronService } from "./cron.service";

/**
 * Controller for cron job endpoints
 * Protected by a secret token to prevent unauthorized access
 */
@Controller("cron")
export class CronController {
  constructor(private readonly cronService: CronService) {}

  /**
   * Verify the cron secret token
   * Can be passed via Authorization header or token query parameter
   */
  private verifyToken(authHeader: string | undefined, tokenParam: string | undefined): void {
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (!expectedToken) {
      throw new UnauthorizedException("CRON_SECRET_TOKEN not configured");
    }

    // Check Authorization header (Bearer token)
    const headerToken = authHeader?.startsWith("Bearer ") 
      ? authHeader.substring(7) 
      : authHeader;

    // Check query parameter
    const providedToken = headerToken || tokenParam;

    if (!providedToken || providedToken !== expectedToken) {
      throw new UnauthorizedException("Invalid or missing cron token");
    }
  }

  /**
   * Execute price ingestion job
   * GET /api/cron/price-ingestion?token=YOUR_TOKEN
   * or GET /api/cron/price-ingestion with Authorization: Bearer YOUR_TOKEN
   */
  @Get("price-ingestion")
  async priceIngestion(
    @Headers("authorization") authHeader: string | undefined,
    @Query("token") tokenParam: string | undefined
  ) {
    this.verifyToken(authHeader, tokenParam);
    return await this.cronService.runPriceIngestion();
  }

  /**
   * Execute metrics refresh job
   * GET /api/cron/metrics-refresh?token=YOUR_TOKEN
   * or GET /api/cron/metrics-refresh with Authorization: Bearer YOUR_TOKEN
   */
  @Get("metrics-refresh")
  async metricsRefresh(
    @Headers("authorization") authHeader: string | undefined,
    @Query("token") tokenParam: string | undefined
  ) {
    this.verifyToken(authHeader, tokenParam);
    return await this.cronService.runMetricsRefresh();
  }

  /**
   * Execute daily check job
   * GET /api/cron/daily-check?token=YOUR_TOKEN
   * or GET /api/cron/daily-check with Authorization: Bearer YOUR_TOKEN
   */
  @Get("daily-check")
  async dailyCheck(
    @Headers("authorization") authHeader: string | undefined,
    @Query("token") tokenParam: string | undefined
  ) {
    this.verifyToken(authHeader, tokenParam);
    return await this.cronService.runDailyCheck();
  }
}

