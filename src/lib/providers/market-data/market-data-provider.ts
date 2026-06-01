import type { AssetType, PriceChangePeriodType } from "@/lib/types";

export interface MarketPriceRequest {
  ticker: string;
  market: string;
  currency: string;
  assetType: AssetType;
  provider?: string;
}

export interface MarketPriceResult {
  ticker: string;
  market: string;
  currency: string;
  price: number;
  priceDate: string;
  source: string;
  fetchedAt: string;
  isDelayed: boolean;
  delayMinutes: number;
  rawResponseOptional?: Record<string, unknown>;
}

export interface HistoricalPriceRequest extends MarketPriceRequest {
  period: PriceChangePeriodType;
}

export interface HistoricalPricePoint {
  date: string;
  price: number;
}

export interface HistoricalPriceResult {
  ticker: string;
  market: string;
  period: PriceChangePeriodType;
  prices: HistoricalPricePoint[];
  startDate: string;
  endDate: string;
  source: string;
  fetchedAt: string;
}

export interface SymbolSearchResult {
  ticker: string;
  market: string;
  currency: string;
  name: string;
  assetType?: AssetType;
}

export interface MarketDataProvider {
  readonly providerName: string;
  getCurrentPrice(input: MarketPriceRequest): Promise<MarketPriceResult>;
  getHistoricalPrices(
    input: HistoricalPriceRequest
  ): Promise<HistoricalPriceResult>;
  searchSymbol(query: string): Promise<SymbolSearchResult[]>;
}
