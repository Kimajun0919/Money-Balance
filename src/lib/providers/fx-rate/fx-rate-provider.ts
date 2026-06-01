export interface FxRateRequest {
  baseCurrency: string;
  quoteCurrency: string;
  date?: string;
  provider?: string;
}

export interface HistoricalFxRateRequest extends FxRateRequest {
  date: string;
}

export interface FxRateResult {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  rateDate: string;
  source: string;
  fetchedAt: string;
  isEstimated: boolean;
  rawResponseOptional?: Record<string, unknown>;
}

export interface FxRateProvider {
  readonly providerName: string;
  getRate(input: FxRateRequest): Promise<FxRateResult>;
  getHistoricalRate(input: HistoricalFxRateRequest): Promise<FxRateResult>;
}
