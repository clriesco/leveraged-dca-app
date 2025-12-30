import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateContributionDto } from './dto/create-contribution.dto';

@Injectable()
export class ContributionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a contribution and immediately update equity
   * When you register a contribution, it goes directly to equity - no "pending" state
   */
  async recordContribution(dto: CreateContributionDto) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: dto.portfolioId },
      include: {
        positions: {
          include: { asset: true },
        },
      },
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    // Create contribution record - mark as deployed immediately since it goes to equity
    const contribution = await this.prisma.monthlyContribution.create({
      data: {
        portfolioId: dto.portfolioId,
        amount: dto.amount,
        note: dto.note,
        contributedAt: new Date(),
        deployed: true, // Immediately deployed - goes to equity
        deployedAt: new Date(),
        deployedAmount: dto.amount,
        deploymentReason: 'manual',
      },
    });

    // Get current equity from latest metrics
    const dailyMetricClient = (this.prisma as any).dailyMetric;
    const latestDailyMetric = dailyMetricClient
      ? await dailyMetricClient.findFirst({
          where: { portfolioId: dto.portfolioId },
          orderBy: { date: 'desc' },
        })
      : null;

    const latestMetrics = await this.prisma.metricsTimeseries.findFirst({
      where: { portfolioId: dto.portfolioId },
      orderBy: { date: 'desc' },
    });

    // Calculate current exposure from positions
    let exposure = 0;
    const latestPrices: Record<string, number> = {};
    
    for (const position of portfolio.positions) {
      const latestPrice = await this.prisma.assetPrice.findFirst({
        where: { assetId: position.assetId },
        orderBy: { date: 'desc' },
      });
      const price = latestPrice?.close || position.avgPrice;
      latestPrices[position.assetId] = price;
      exposure += position.quantity * price;
    }

    // Current equity (before contribution)
    const currentEquity =
      latestDailyMetric?.equity ?? latestMetrics?.equity ?? portfolio.initialCapital;

    // New equity after contribution
    const newEquity = currentEquity + dto.amount;

    // Calculate new leverage
    const newLeverage = newEquity > 0 ? exposure / newEquity : 0;

    // Calculate peak equity
    let peakEquity = newEquity;
    if (latestDailyMetric?.peakEquity) {
      peakEquity = Math.max(latestDailyMetric.peakEquity, newEquity);
    } else if (latestMetrics) {
      // Get peak from all metrics
      const allMetrics = await this.prisma.metricsTimeseries.findMany({
        where: { portfolioId: dto.portfolioId },
        select: { equity: true },
      });
      for (const m of allMetrics) {
        if (m.equity > peakEquity) {
          peakEquity = m.equity;
        }
      }
      peakEquity = Math.max(peakEquity, newEquity);
    }

    // Calculate margin ratio
    const marginRatio = exposure > 0 ? newEquity / exposure : 1;

    // Update or create daily metric with new equity
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dailyMetricClient) {
      await dailyMetricClient.upsert({
        where: {
          portfolioId_date: {
            portfolioId: dto.portfolioId,
            date: today,
          },
        },
        create: {
          portfolioId: dto.portfolioId,
          date: today,
          equity: newEquity,
          exposure,
          leverage: newLeverage,
          peakEquity,
          marginRatio,
        },
        update: {
          equity: newEquity,
          exposure,
          leverage: newLeverage,
          peakEquity,
          marginRatio,
        },
      });
    }

    return contribution;
  }
}

