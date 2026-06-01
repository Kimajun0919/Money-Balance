import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/lib/storage/default-state";
import { refreshMarketPrices } from "@/lib/services/market-data-service";
import { makeAsset } from "../helpers";

describe("market-data-service", () => {
  it("모의 시세 공급자로 현재가와 기간 수익률을 정규화한다", async () => {
    const state = {
      ...createDefaultState(),
      assets: [
        makeAsset({
          assetType: "growth",
          amount: 5000,
          currency: "USD",
          exchangeRate: 1350,
          ticker: "SPY",
          market: "NYSE",
          quantity: 10
        })
      ]
    };

    const result = await refreshMarketPrices(state);

    expect(result.items[0].price?.price).toBe(520);
    expect(result.state.assets[0].valuationAmount).toBe(5200);
    expect(result.state.assets[0].lastPriceUpdatedAt).toBeDefined();
    expect(result.state.marketPriceSnapshots).toHaveLength(1);
  });
});
