import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PortfoliosModule } from '../portfolios/portfolios.module';

import { PositionsController } from './positions.controller';
import { PositionsService } from './positions.service';

@Module({
  imports: [PortfoliosModule, AuthModule],
  controllers: [PositionsController],
  providers: [PositionsService],
  exports: [PositionsService],
})
export class PositionsModule {}

