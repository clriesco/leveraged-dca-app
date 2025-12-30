import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { CreateContributionDto } from './dto/create-contribution.dto';

@Controller('contributions')
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateContributionDto) {
    return this.contributionsService.recordContribution(dto);
  }
}

