import { describe, expect, it } from "vitest";
import {
  calculateAssetAfterTaxExpectedReturn,
  calculateAssetExpectedReturn,
  detectIllusionWarningForAsset
} from "@/lib/engines/return-calculation-engine";
import { makeAsset } from "../helpers";

describe("return-calculation-engine", () => {
  it("자산 기대수익률은 인컴수익률과 기대 가격수익률의 합이다", () => {
    expect(
      calculateAssetExpectedReturn({
        incomeYield: 0.035,
        expectedCapitalReturn: 0.045
      })
    ).toBe(0.08);
  });

  it("커버드콜 기본 가정은 10% 인컴과 -1.5% 가격수익률로 8.5%가 된다", () => {
    expect(
      calculateAssetExpectedReturn({
        incomeYield: 0.1,
        expectedCapitalReturn: -0.015
      })
    ).toBe(0.085);
  });

  it("양수 가격수익률에만 양도 관련 참고 세율을 적용한다", () => {
    const result = calculateAssetAfterTaxExpectedReturn({
      incomeYield: 0.04,
      expectedCapitalReturn: 0.06,
      incomeTaxRate: 0.1,
      capitalGainTaxRate: 0.2
    });

    expect(result).toBe(0.084);
  });

  it("음수 가격수익률에는 세금 환급 효과를 적용하지 않는다", () => {
    const result = calculateAssetAfterTaxExpectedReturn({
      incomeYield: 0.04,
      expectedCapitalReturn: -0.06,
      incomeTaxRate: 0.1,
      capitalGainTaxRate: 0.2
    });

    expect(result).toBe(-0.024);
  });

  it("인컴 8% 이상이고 총수익률이 음수이면 주의로 분류한다", () => {
    const result = detectIllusionWarningForAsset(
      makeAsset({
        assetType: "covered_call",
        incomeYield: 0.08,
        priceChangeRate: -0.09
      })
    );

    expect(result.level).toBe("caution");
  });

  it("인컴 10% 이상이고 가격 변화율이 -10% 이하이면 경고로 분류한다", () => {
    const result = detectIllusionWarningForAsset(
      makeAsset({
        assetType: "covered_call",
        incomeYield: 0.1,
        priceChangeRate: -0.1
      })
    );

    expect(result.level).toBe("warning");
  });

  it("인컴 12% 이상이고 총수익률이 음수이면 위험으로 분류한다", () => {
    const result = detectIllusionWarningForAsset(
      makeAsset({
        assetType: "covered_call",
        incomeYield: 0.12,
        priceChangeRate: -0.13
      })
    );

    expect(result.level).toBe("danger");
  });
});
