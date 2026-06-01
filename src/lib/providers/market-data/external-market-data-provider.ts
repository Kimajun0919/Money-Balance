import type {
  HistoricalPriceRequest,
  HistoricalPriceResult,
  MarketDataProvider,
  MarketPriceRequest,
  MarketPriceResult,
  SymbolSearchResult
} from "@/lib/providers/market-data/market-data-provider";

export class ExternalMarketDataProvider implements MarketDataProvider {
  readonly providerName = "external-market-data-disabled";

  async getCurrentPrice(
    _input: MarketPriceRequest
  ): Promise<MarketPriceResult> {
    throw new Error(
      "실제 시세 API 설정이 없습니다. 환경 변수를 설정하기 전에는 모의 시세 공급자를 사용해야 합니다."
    );
  }

  async getHistoricalPrices(
    _input: HistoricalPriceRequest
  ): Promise<HistoricalPriceResult> {
    throw new Error(
      "실제 과거 시세 API 설정이 없습니다. 환경 변수를 설정하기 전에는 모의 시세 공급자를 사용해야 합니다."
    );
  }

  async searchSymbol(_query: string): Promise<SymbolSearchResult[]> {
    return [];
  }
}
