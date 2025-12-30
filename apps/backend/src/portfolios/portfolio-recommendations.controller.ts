import { Controller, Get, Param, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";

import { PortfolioRecommendationsService } from "./portfolio-recommendations.service";

/**
 * Controller for portfolio recommendations
 * Exposes endpoints to get actionable recommendations based on strategy rules
 */
@Controller("portfolios/:portfolioId/recommendations")
@UseGuards(AuthGuard)
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

