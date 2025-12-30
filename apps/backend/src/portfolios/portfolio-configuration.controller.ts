import { Controller, Get, Put, Param, Body } from "@nestjs/common";
import { PortfolioConfigurationService } from "./portfolio-configuration.service";
import {
  UpdatePortfolioConfigurationDto,
  PortfolioConfigurationResponse,
} from "./dto/portfolio-configuration.dto";

/**
 * Controller for portfolio configuration endpoints
 */
@Controller("portfolios/:portfolioId/configuration")
export class PortfolioConfigurationController {
  constructor(
    private readonly configurationService: PortfolioConfigurationService
  ) {}

  /**
   * Get portfolio configuration
   * GET /api/portfolios/:portfolioId/configuration
   */
  @Get()
  async getConfiguration(
    @Param("portfolioId") portfolioId: string
  ): Promise<PortfolioConfigurationResponse> {
    return this.configurationService.getConfiguration(portfolioId);
  }

  /**
   * Update portfolio configuration
   * PUT /api/portfolios/:portfolioId/configuration
   */
  @Put()
  async updateConfiguration(
    @Param("portfolioId") portfolioId: string,
    @Body() dto: UpdatePortfolioConfigurationDto
  ): Promise<PortfolioConfigurationResponse> {
    return this.configurationService.updateConfiguration(portfolioId, dto);
  }

  /**
   * Get target weights for portfolio
   * GET /api/portfolios/:portfolioId/configuration/target-weights
   */
  @Get("target-weights")
  async getTargetWeights(
    @Param("portfolioId") portfolioId: string
  ): Promise<{ targetWeights: Record<string, number> }> {
    const targetWeights =
      await this.configurationService.getTargetWeights(portfolioId);
    return { targetWeights };
  }

  /**
   * Check if today is contribution day
   * GET /api/portfolios/:portfolioId/configuration/is-contribution-day
   */
  @Get("is-contribution-day")
  async isContributionDay(
    @Param("portfolioId") portfolioId: string
  ): Promise<{ isContributionDay: boolean; nextContributionDate: string | null }> {
    const isContributionDay =
      await this.configurationService.isContributionDay(portfolioId);
    const nextDate =
      await this.configurationService.getNextContributionDate(portfolioId);

    return {
      isContributionDay,
      nextContributionDate: nextDate ? nextDate.toISOString() : null,
    };
  }
}

