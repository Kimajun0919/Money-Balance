import { describe, expect, it } from "vitest";
import { normalizeExternalAsset } from "@/lib/services/asset-normalization-service";

describe("asset-normalization-service", () => {
  it("브로커 원천 데이터를 내부 자산 형식으로 정규화하고 원천 데이터를 보존한다", () => {
    const result = normalizeExternalAsset(
      {
        externalAssetId: "ext-1",
        assetName: "SPDR S&P 500 ETF",
        ticker: "SPY",
        market: "NYSE",
        currency: "USD",
        quantity: 2,
        currentPrice: 520,
        exchangeRate: 1350,
        rawData: { providerRow: 1 }
      },
      {
        brokerName: "모의 증권사",
        externalConnectionId: "conn-1",
        syncedAt: "2026-06-01T00:00:00.000Z"
      }
    );

    expect(result.assetInput.valuationAmount).toBe(1040);
    expect(result.asset.valuationAmountKrw).toBe(1_404_000);
    expect(result.rawData.providerRow).toBe(1);
    expect(result.asset.externalConnectionId).toBe("conn-1");
  });
});
