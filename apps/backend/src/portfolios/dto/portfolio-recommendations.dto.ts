/**
 * Current portfolio state
 */
export interface PortfolioCurrentState {
  equity: number;
  exposure: number;
  leverage: number;
  marginRatio: number;
  peakEquity: number;
  pendingContributions: number;
  positionValues: Record<string, number>;
  positionQuantities: Record<string, number>;
}

/**
 * Deploy signals evaluation
 */
export interface DeploySignals {
  drawdown: number;
  drawdownTriggered: boolean;
  weightDeviation: number;
  weightDeviationTriggered: boolean;
  volatility: number | null;
  volatilityTriggered: boolean;
  anySignalTriggered: boolean;
  deployFraction: number;
}

/**
 * Purchase recommendation for a single asset
 */
export interface PurchaseRecommendation {
  assetId: string;
  assetSymbol: string;
  assetName: string;
  quantity: number;
  unit: string;
  valueUsd: number;
  targetWeight: number;
  currentPrice: number;
}

/**
 * Extra contribution recommendation
 */
export interface ExtraContributionRecommendation {
  amount: number;
  currency: string;
  reason: string;
  currentLeverage: number;
  targetLeverage: number;
}

/**
 * Contribution reminder
 */
export interface ContributionReminder {
  suggestedAmount: number;
  currency: string;
}

/**
 * Recommendation actions based on type
 */
export interface RecommendationActions {
  // For leverage_low: specific purchases
  purchases?: PurchaseRecommendation[];
  totalPurchaseValue?: number;

  // For leverage_high: extra contribution needed
  extraContribution?: ExtraContributionRecommendation;

  // For contribution_due: reminder
  contributionReminder?: ContributionReminder;
}

/**
 * Priority levels for recommendations
 */
export type RecommendationPriority = "low" | "medium" | "high" | "urgent";

/**
 * Recommendation types
 */
export type RecommendationType =
  | "contribution_due"
  | "leverage_low"
  | "leverage_high"
  | "deploy_signal"
  | "rebalance_needed"
  | "in_range";

/**
 * Single recommendation
 */
export interface Recommendation {
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  actions?: RecommendationActions;
  actionUrl?: string;
}

/**
 * Full recommendations response
 */
export interface PortfolioRecommendationsResponse {
  portfolioId: string;
  portfolioName: string;
  timestamp: string;

  // Current state
  currentState: PortfolioCurrentState;

  // Configuration summary
  configuration: {
    leverageMin: number;
    leverageMax: number;
    leverageTarget: number;
    monthlyContribution: number | null;
    contributionDayOfMonth: number;
    targetWeights: Record<string, number>;
  };

  // Deploy signals
  signals: DeploySignals;

  // Recommendations list
  recommendations: Recommendation[];

  // Contribution info
  isContributionDay: boolean;
  nextContributionDate: string | null;

  // Summary
  summary: {
    leverageStatus: "low" | "in_range" | "high";
    actionRequired: boolean;
    primaryRecommendation: string | null;
  };
}

