import { describe, expect, it } from "vitest";
import { getAssetFreshnessWarnings } from "@/lib/services/data-freshness-service";
import { makeAsset } from "../helpers";

describe("data-freshness-service", () => {
  it("24시간이 지난 시세 데이터에 경고를 만든다", () => {
    const asset = makeAsset({
      assetType: "growth",
      ticker: "SPY",
      market: "NYSE",
      quantity: 1
    });
    asset.valuationSource = "market_price";
    asset.priceSource = "test";
    asset.lastPriceUpdatedAt = "2026-05-30T00:00:00.000Z";

    const warnings = getAssetFreshnessWarnings(
      asset,
      new Date("2026-06-01T12:00:00.000Z")
    );

    expect(warnings.some((warning) => warning.type === "market_price")).toBe(true);
  });
});
