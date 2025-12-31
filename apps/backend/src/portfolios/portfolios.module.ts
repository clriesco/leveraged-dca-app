import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";

import { OnboardingService } from "./onboarding.service";
import { PortfolioConfigurationController } from "./portfolio-configuration.controller";
import { PortfolioConfigurationService } from "./portfolio-configuration.service";
import { PortfolioRecommendationsController } from "./portfolio-recommendations.controller";
import { PortfolioRecommendationsService } from "./portfolio-recommendations.service";
import { PortfoliosController } from "./portfolios.controller";
import { PortfoliosService } from "./portfolios.service";


@Module({
  imports: [AuthModule],
  controllers: [
    PortfoliosController,
    PortfolioConfigurationController,
    PortfolioRecommendationsController,
  ],
  providers: [
    PortfoliosService,
    PortfolioConfigurationService,
    PortfolioRecommendationsService,
    OnboardingService,
  ],
  exports: [
    PortfoliosService,
    PortfolioConfigurationService,
    PortfolioRecommendationsService,
    OnboardingService,
  ],
})
export class PortfoliosModule {}

