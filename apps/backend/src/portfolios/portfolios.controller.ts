import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

import { PortfoliosService } from "./portfolios.service";

@Controller("portfolios")
@UseGuards(AuthGuard)
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  /**
   * Get portfolios by user email
   * GET /api/portfolios?email=user@example.com
   */
  @Get()
  async findByUser(
    @Query("email") email: string,
    @CurrentUser() user: any
  ) {
    // Ensure user can only access their own portfolios
    if (email && email !== user.email) {
      throw new Error("Unauthorized: Cannot access other user's portfolios");
    }
    return this.portfoliosService.findByUserEmail(user.email);
  }

  /**
   * Get portfolio by ID with positions
   * GET /api/portfolios/:id
   */
  @Get(":id")
  async find(@Param("id") id: string) {
    return this.portfoliosService.findById(id);
  }

  /**
   * Get portfolio metrics history
   * GET /api/portfolios/:id/metrics
   */
  @Get(":id/metrics")
  async metrics(@Param("id") id: string) {
    return this.portfoliosService.getMetrics(id);
  }

  /**
   * Get portfolio summary (latest metrics + positions)
   * GET /api/portfolios/:id/summary
   */
  @Get(":id/summary")
  async summary(@Param("id") id: string) {
    return this.portfoliosService.getSummary(id);
  }

  /**
   * Get portfolio daily metrics
   * GET /api/portfolios/:id/daily-metrics
   */
  @Get(":id/daily-metrics")
  async dailyMetrics(@Param("id") id: string) {
    return this.portfoliosService.getDailyMetrics(id);
  }
}
