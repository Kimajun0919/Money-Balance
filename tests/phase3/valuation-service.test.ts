import { describe, expect, it } from "vitest";
import { updateAssetValuation } from "@/lib/services/valuation-service";
import type { FxRateResult } from "@/lib/providers/fx-rate/fx-rate-provider";
import type {
  HistoricalPriceResult,
  MarketPriceResult
} from "@/lib/providers/market-data/market-data-provider";
import { makeAsset } from "../helpers";

const marketPrice: MarketPriceResult = {
  ticker: "SPY",
  market: "NYSE",
  currency: "USD",
  price: 520,
  priceDate: "2026-06-01",
  source: "test-price",
  fetchedAt: "2026-06-01T06:00:00.000Z",
  isDelayed: true,
  delayMinutes: 15
};

const historicalPrices: HistoricalPriceResult = {
  ticker: "SPY",
  market: "NYSE",
  period: "1y",
  prices: [
    { date: "2025-06-01", price: 400 },
    { date: "2026-06-01", price: 520 }
  ],
  startDate: "2025-06-01",
  endDate: "2026-06-01",
  source: "test-price",
  fetchedAt: "2026-06-01T06:00:00.000Z"
};

const fxRate: FxRateResult = {
  baseCurrency: "USD",
  quoteCurrency: "KRW",
  rate: 1350,
  rateDate: "2026-06-01",
  source: "test-fx",
  fetchedAt: "2026-06-01T06:00:00.000Z",
  isEstimated: false
};

describe("valuation-service", () => {
  it("수량과 시세, 환율을 이용해 평가금액을 갱신한다", () => {
    const asset = makeAsset({
      assetType: "growth",
      amount: 5000,
      currency: "USD",
      exchangeRate: 1300,
      ticker: "SPY",
      market: "NYSE",
      quantity: 10
    });
    asset.purchaseAmount = 4000;

    const result = updateAssetValuation({
      asset,
      marketPrice,
      historicalPrices,
      fxRate
    });

    expect(result.asset.valuationAmount).toBe(5200);
    expect(result.asset.valuationAmountKrw).toBe(7_020_000);
    expect(result.asset.priceChangeRate).toBeCloseTo(0.3);
    expect(result.asset.priceChangeRateAnnualized).toBeCloseTo(0.3);
    expect(result.asset.purchaseAmount).toBe(4000);
    expect(result.asset.valuationSource).toBe("market_price");
  });

  it("종목코드가 없으면 수동 평가금액을 유지한다", () => {
    const asset = makeAsset({ assetType: "growth", amount: 1000 });
    const result = updateAssetValuation({ asset, fxRate });

    expect(result.asset.valuationAmount).toBe(1000);
    expect(result.usedManualValuation).toBe(true);
    expect(result.warnings.join(" ")).toContain("종목코드");
  });
});
