import type {
  HistoricalPriceRequest,
  HistoricalPriceResult,
  MarketDataProvider,
  MarketPriceRequest,
  MarketPriceResult,
  SymbolSearchResult
} from "@/lib/providers/market-data/market-data-provider";
import { getPeriodMonths } from "@/lib/utils/annualize";

const MOCK_PRICES: Record<
  string,
  { name: string; market: string; currency: string; price: number }
> = {
  "SPY:NYSE": { name: "SPDR S&P 500 ETF", market: "NYSE", currency: "USD", price: 520 },
  "QYLD:NASDAQ": {
    name: "Global X Nasdaq 100 Covered Call ETF",
    market: "NASDAQ",
    currency: "USD",
    price: 17.5
  },
  "SCHD:NYSE": {
    name: "Schwab US Dividend Equity ETF",
    market: "NYSE",
    currency: "USD",
    price: 78.2
  },
  "VNQ:NYSE": { name: "Vanguard Real Estate ETF", market: "NYSE", currency: "USD", price: 84.4 },
  "005930:KRX": { name: "삼성전자", market: "KRX", currency: "KRW", price: 80000 }
};

function keyOf(ticker: string, market: string) {
  return `${ticker.trim().toUpperCase()}:${market.trim().toUpperCase()}`;
}

function deterministicFallbackPrice(ticker: string) {
  const seed = ticker
    .trim()
    .toUpperCase()
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Math.max(1, Math.round((seed % 500) + 25));
}

function isoDateMonthsAgo(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().slice(0, 10);
}

export class MockMarketDataProvider implements MarketDataProvider {
  readonly providerName = "mock-market-data";

  async getCurrentPrice(
    input: MarketPriceRequest
  ): Promise<MarketPriceResult> {
    const key = keyOf(input.ticker, input.market);
    const known = MOCK_PRICES[key];
    const now = new Date().toISOString();

    return {
      ticker: input.ticker.trim().toUpperCase(),
      market: input.market.trim().toUpperCase(),
      currency: known?.currency ?? input.currency.toUpperCase(),
      price: known?.price ?? deterministicFallbackPrice(input.ticker),
      priceDate: now.slice(0, 10),
      source: this.providerName,
      fetchedAt: now,
      isDelayed: true,
      delayMinutes: 15,
      rawResponseOptional: known ? { name: known.name } : { mocked: true }
    };
  }

  async getHistoricalPrices(
    input: HistoricalPriceRequest
  ): Promise<HistoricalPriceResult> {
    const current = await this.getCurrentPrice(input);
    const months = getPeriodMonths(input.period);
    const periodReturn = months <= 1 ? 0.02 : months <= 3 ? 0.035 : months <= 6 ? 0.06 : 0.1;
    const startPrice = Number((current.price / (1 + periodReturn)).toFixed(4));
    const now = new Date().toISOString();

    return {
      ticker: current.ticker,
      market: current.market,
      period: input.period,
      prices: [
        { date: isoDateMonthsAgo(months), price: startPrice },
        { date: current.priceDate, price: current.price }
      ],
      startDate: isoDateMonthsAgo(months),
      endDate: current.priceDate,
      source: this.providerName,
      fetchedAt: now
    };
  }

  async searchSymbol(query: string): Promise<SymbolSearchResult[]> {
    const normalized = query.trim().toUpperCase();
    return Object.entries(MOCK_PRICES)
      .filter(([key, value]) => key.includes(normalized) || value.name.toUpperCase().includes(normalized))
      .map(([key, value]) => {
        const [ticker, market] = key.split(":");
        return {
          ticker,
          market,
          currency: value.currency,
          name: value.name
        };
      });
  }
}
