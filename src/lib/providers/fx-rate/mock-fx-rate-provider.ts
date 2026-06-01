import type {
  FxRateProvider,
  FxRateRequest,
  FxRateResult,
  HistoricalFxRateRequest
} from "@/lib/providers/fx-rate/fx-rate-provider";

const MOCK_RATES: Record<string, number> = {
  "KRW:KRW": 1,
  "USD:KRW": 1350,
  "JPY:KRW": 9.2,
  "EUR:KRW": 1460,
  "GBP:KRW": 1710
};

function rateKey(baseCurrency: string, quoteCurrency: string) {
  return `${baseCurrency.trim().toUpperCase()}:${quoteCurrency.trim().toUpperCase()}`;
}

export class MockFxRateProvider implements FxRateProvider {
  readonly providerName = "mock-fx-rate";

  async getRate(input: FxRateRequest): Promise<FxRateResult> {
    const baseCurrency = input.baseCurrency.trim().toUpperCase();
    const quoteCurrency = input.quoteCurrency.trim().toUpperCase();
    const now = new Date().toISOString();
    const directRate = MOCK_RATES[rateKey(baseCurrency, quoteCurrency)];
    const reverseRate = MOCK_RATES[rateKey(quoteCurrency, baseCurrency)];

    return {
      baseCurrency,
      quoteCurrency,
      rate: directRate ?? (reverseRate ? 1 / reverseRate : 1),
      rateDate: input.date ?? now.slice(0, 10),
      source: this.providerName,
      fetchedAt: now,
      isEstimated: !directRate,
      rawResponseOptional: { mocked: true }
    };
  }

  async getHistoricalRate(
    input: HistoricalFxRateRequest
  ): Promise<FxRateResult> {
    return this.getRate(input);
  }
}
