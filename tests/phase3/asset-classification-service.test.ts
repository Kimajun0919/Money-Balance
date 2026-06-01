import { describe, expect, it } from "vitest";
import { classifyAsset } from "@/lib/services/asset-classification-service";

describe("asset-classification-service", () => {
  it("커버드콜 ETF 단서를 자산군 제안으로 변환한다", () => {
    const result = classifyAsset({
      assetName: "Global X Nasdaq 100 Covered Call ETF",
      ticker: "QYLD"
    });

    expect(result.suggestedAssetType).toBe("covered_call");
    expect(result.confidenceScore).toBeGreaterThan(0.8);
  });

  it("사용자 확인 값이 자동 분류보다 우선한다", () => {
    const result = classifyAsset({
      assetName: "SPDR S&P 500 ETF",
      userSelectedAssetType: "dividend"
    });

    expect(result.suggestedAssetType).toBe("dividend");
    expect(result.confidenceScore).toBe(1);
  });
});
