import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { UpsertPositionsDto } from './dto/upsert-positions.dto';

@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Post()
  @HttpCode(201)
  async upsert(@Body() dto: UpsertPositionsDto) {
    console.log("[PositionsController] Received upsert request:", {
      portfolioId: dto.portfolioId,
      positionsCount: dto.positions?.length || 0,
      positions: dto.positions?.map(p => ({ symbol: p.symbol, quantity: p.quantity })),
      hasEquity: dto.equity !== undefined,
      equity: dto.equity
    });
    
    try {
      const result = await this.positionsService.upsert(dto);
      console.log("[PositionsController] Upsert completed successfully, returning", result?.length || 0, "positions");
      return result;
    } catch (error) {
      console.error("[PositionsController] Error in upsert:", error);
      throw error;
    }
  }

  @Get('search-symbols')
  async searchSymbols(@Query('q') query: string) {
    return this.positionsService.searchSymbols(query);
  }
}

