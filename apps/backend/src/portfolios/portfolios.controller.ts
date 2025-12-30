import { Controller, Get, Param, Query } from "@nestjs/common";
import { PortfoliosService } from "./portfolios.service";

@Controller("portfolios")
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  /**
   * Get portfolios by user email
   * GET /api/portfolios?email=user@example.com
   */
  @Get()
  async findByUser(@Query("email") email: string) {
    return this.portfoliosService.findByUserEmail(email);
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
