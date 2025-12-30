import { Controller, Get, Param } from "@nestjs/common";
import { PortfolioRecommendationsService } from "./portfolio-recommendations.service";

/**
 * Controller for portfolio recommendations
 * Exposes endpoints to get actionable recommendations based on strategy rules
 */
@Controller("portfolios/:portfolioId/recommendations")
export class PortfolioRecommendationsController {
  constructor(
    private readonly recommendationsService: PortfolioRecommendationsService
  ) {}

  /**
   * Get all recommendations for a portfolio
   * Includes current state, signals, and specific actions
   *
   * @param portfolioId - Portfolio ID
   * @returns Full recommendations response with actions
   */
  @Get()
  async getRecommendations(@Param("portfolioId") portfolioId: string) {
    return this.recommendationsService.getRecommendations(portfolioId);
  }
}

