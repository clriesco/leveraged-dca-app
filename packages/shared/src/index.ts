export type AssetSymbol = "GOLD" | "BTC" | "SP500";

export interface PortfolioSnapshot {
  timestamp: string;
  equity: number;
  exposure: number;
  leverage: number;
}

export const SUPPORTED_ASSETS: AssetSymbol[] = ["GOLD", "BTC", "SP500"];
