import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/lib/storage/default-state";
import { refreshFxRates } from "@/lib/services/fx-rate-service";
import { makeAsset } from "../helpers";

describe("fx-rate-service", () => {
  it("KRW 자산은 환율 조회 없이 유지하고 USD 자산에는 환율을 적용한다", async () => {
    const state = {
      ...createDefaultState(),
      assets: [
        makeAsset({ assetType: "cash", amount: 1_000_000 }),
        makeAsset({
          assetType: "growth",
          amount: 1000,
          currency: "USD",
          exchangeRate: 1300
        })
      ]
    };

    const result = await refreshFxRates(state);

    expect(result.rates).toHaveLength(1);
    expect(result.state.assets[0].exchangeRate).toBe(1);
    expect(result.state.assets[1].exchangeRate).toBe(1350);
    expect(result.state.assets[1].valuationAmountKrw).toBe(1_350_000);
  });
});
