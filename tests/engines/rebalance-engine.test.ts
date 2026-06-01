import { describe, expect, it } from "vitest";
import {
  calculateRebalance,
  calculateRebalanceItems
} from "@/lib/engines/rebalance-engine";
import { makeAsset } from "../helpers";

describe("rebalance-engine", () => {
  it("조정 필요 금액은 목표금액에서 현재금액을 뺀 값이다", () => {
    const items = calculateRebalanceItems({
      assets: [
        makeAsset({ assetType: "cash", amount: 90_000_000 }),
        makeAsset({ assetType: "dividend", amount: 10_000_000 })
      ],
      targetAllocations: [{ assetType: "dividend", targetRatio: 0.2 }]
    });
    const dividend = items.find((item) => item.assetType === "dividend");

    expect(dividend?.adjustmentAmount).toBe(10_000_000);
  });

  it("목표보다 많은 자산군은 조정 필요 금액이 음수다", () => {
    const items = calculateRebalanceItems({
      assets: [
        makeAsset({ assetType: "cash", amount: 70_000_000 }),
        makeAsset({ assetType: "dividend", amount: 30_000_000 })
      ],
      targetAllocations: [{ assetType: "dividend", targetRatio: 0.2 }]
    });
    const dividend = items.find((item) => item.assetType === "dividend");

    expect(dividend?.adjustmentAmount).toBe(-10_000_000);
  });

  it("여러 상태가 있으면 우선순위가 가장 높은 상태를 primaryStatus로 쓴다", () => {
    const result = calculateRebalance({
      assets: [makeAsset({ assetType: "growth", amount: 10_000_000 })],
      targetAllocations: [{ assetType: "growth", targetRatio: 1 }],
      targetReturn: 0.1,
      portfolioExpectedReturn: 0.05,
      riskScore: 90,
      riskScoreLimit: 60,
      cashRatio: 0,
      minCashRatio: 0.1,
      illusionWarnings: []
    });

    expect(result.activeFlags).toContain("cash_shortage");
    expect(result.activeFlags).toContain("risk_excess");
    expect(result.primaryStatus).toBe("cash_shortage");
  });

  it("허용오차 안의 비중 차이는 배분 차이 상태로 보지 않는다", () => {
    const items = calculateRebalanceItems({
      assets: [
        makeAsset({ assetType: "cash", amount: 79_000_000 }),
        makeAsset({ assetType: "dividend", amount: 21_000_000 })
      ],
      targetAllocations: [{ assetType: "dividend", targetRatio: 0.2 }]
    });
    const dividend = items.find((item) => item.assetType === "dividend");

    expect(dividend?.hasAllocationGap).toBe(false);
  });
});
