import { Module } from "@nestjs/common";
import { RebalanceController } from "./rebalance.controller";
import { RebalanceService } from "./rebalance.service";
import { PrismaModule } from "../prisma/prisma.module";
import { PortfoliosModule } from "../portfolios/portfolios.module";

/**
 * Module for portfolio rebalancing operations
 */
@Module({
  imports: [PrismaModule, PortfoliosModule],
  controllers: [RebalanceController],
  providers: [RebalanceService],
  exports: [RebalanceService],
})
export class RebalanceModule {}

