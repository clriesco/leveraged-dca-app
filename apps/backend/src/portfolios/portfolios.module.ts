import { Module } from "@nestjs/common";
import { PortfoliosController } from "./portfolios.controller";
import { PortfoliosService } from "./portfolios.service";
import { PortfolioConfigurationController } from "./portfolio-configuration.controller";
import { PortfolioConfigurationService } from "./portfolio-configuration.service";
import { PortfolioRecommendationsController } from "./portfolio-recommendations.controller";
import { PortfolioRecommendationsService } from "./portfolio-recommendations.service";

@Module({
  controllers: [
    PortfoliosController,
    PortfolioConfigurationController,
    PortfolioRecommendationsController,
  ],
  providers: [
    PortfoliosService,
    PortfolioConfigurationService,
    PortfolioRecommendationsService,
  ],
  exports: [
    PortfoliosService,
    PortfolioConfigurationService,
    PortfolioRecommendationsService,
  ],
})
export class PortfoliosModule {}

