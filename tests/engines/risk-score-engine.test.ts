import { describe, expect, it } from "vitest";
import { calculatePortfolioRiskScore } from "@/lib/engines/risk-score-engine";
import { makeAsset } from "../helpers";

describe("risk-score-engine", () => {
  it("성장자산 50%는 자산구성 점수에 45를 기여한다", () => {
    const result = calculatePortfolioRiskScore({
      assets: [
        makeAsset({ assetType: "growth", amount: 50_000_000 }),
        makeAsset({ assetType: "cash", amount: 50_000_000 })
      ],
      minCashRatio: 0.05,
      riskScoreLimit: 80
    });

    expect(result.components.assetCompositionScore).toBe(45);
  });

  it("단일 자산 비중이 30%를 넘으면 집중도 점수는 100이다", () => {
    const result = calculatePortfolioRiskScore({
      assets: [
        makeAsset({ assetType: "growth", amount: 40_000_000 }),
        makeAsset({ assetType: "cash", amount: 60_000_000 })
      ],
      minCashRatio: 0.05,
      riskScoreLimit: 80
    });

    expect(result.components.concentrationScore).toBe(100);
  });

  it("현금성 자산이 없으면 현금 부족 점수가 100이 된다", () => {
    const result = calculatePortfolioRiskScore({
      assets: [makeAsset({ assetType: "growth", amount: 10_000_000 })],
      minCashRatio: 0.1,
      riskScoreLimit: 80
    });

    expect(result.components.cashShortageScore).toBe(100);
  });

  it("외화 자산 비중이 50% 이상이면 환노출 점수가 100이다", () => {
    const result = calculatePortfolioRiskScore({
      assets: [
        makeAsset({
          assetType: "growth",
          amount: 10_000,
          currency: "USD",
          exchangeRate: 1000
        }),
        makeAsset({ assetType: "cash", amount: 10_000_000 })
      ],
      minCashRatio: 0.05,
      riskScoreLimit: 80
    });

    expect(result.components.fxExposureScore).toBe(100);
  });

  it("가격 하락 점수는 연환산 가격 변화율을 사용한다", () => {
    const result = calculatePortfolioRiskScore({
      assets: [
        makeAsset({
          assetType: "dividend",
          amount: 10_000_000,
          priceChangeRate: -0.06
        })
      ],
      minCashRatio: 0.05,
      riskScoreLimit: 80
    });

    expect(result.components.priceDeclineScore).toBe(60);
  });
});
