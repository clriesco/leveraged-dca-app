import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ContributionsModule } from "./contributions/contributions.module";
import { PositionsModule } from "./positions/positions.module";
import { PortfoliosModule } from "./portfolios/portfolios.module";
import { RebalanceModule } from "./rebalance/rebalance.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ContributionsModule,
    PositionsModule,
    PortfoliosModule,
    RebalanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
