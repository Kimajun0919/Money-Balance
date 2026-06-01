import { describe, expect, it } from "vitest";
import { calculateMonthlyAllocation } from "@/lib/engines/monthly-allocation-engine";
import { makeAsset } from "../helpers";

describe("monthly-allocation-engine", () => {
  it("현금성 비중이 최소 기준보다 낮으면 신규 투자금이 먼저 현금으로 간다", () => {
    const result = calculateMonthlyAllocation({
      assets: [makeAsset({ assetType: "growth", amount: 100_000_000 })],
      targetAllocations: [{ assetType: "growth", targetRatio: 1 }],
      monthlyInvestment: 5_000_000,
      minCashRatio: 0.1
    });

    expect(result.cashFirstAllocated).toBe(5_000_000);
    expect(result.items[0].assetType).toBe("cash");
  });

  it("현금성 비중이 충족되면 부족 금액 기준으로 남은 투자금을 배분한다", () => {
    const result = calculateMonthlyAllocation({
      assets: [
        makeAsset({ assetType: "cash", amount: 20_000_000 }),
        makeAsset({ assetType: "growth", amount: 80_000_000 })
      ],
      targetAllocations: [
        { assetType: "growth", targetRatio: 0.5 },
        { assetType: "dividend", targetRatio: 0.5 }
      ],
      monthlyInvestment: 10_000_000,
      minCashRatio: 0.1
    });

    expect(result.cashFirstAllocated).toBe(0);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].assetType).toBe("dividend");
  });

  it("초과 보유 자산군은 부족 금액 배분에서 제외된다", () => {
    const result = calculateMonthlyAllocation({
      assets: [
        makeAsset({ assetType: "cash", amount: 20_000_000 }),
        makeAsset({ assetType: "growth", amount: 80_000_000 })
      ],
      targetAllocations: [
        { assetType: "growth", targetRatio: 0.3 },
        { assetType: "dividend", targetRatio: 0.7 }
      ],
      monthlyInvestment: 10_000_000,
      minCashRatio: 0.1
    });

    expect(result.items.some((item) => item.assetType === "growth")).toBe(false);
  });

  it("고분배 착시 경고가 있는 자산군은 배분에서 제외된다", () => {
    const result = calculateMonthlyAllocation({
      assets: [makeAsset({ assetType: "cash", amount: 20_000_000 })],
      targetAllocations: [
        { assetType: "covered_call", targetRatio: 0.5 },
        { assetType: "dividend", targetRatio: 0.5 }
      ],
      monthlyInvestment: 10_000_000,
      minCashRatio: 0.1,
      excludedAssetTypes: ["covered_call"]
    });

    expect(result.items.some((item) => item.assetType === "covered_call")).toBe(false);
    expect(result.items[0].assetType).toBe("dividend");
  });

  it("총 배분 금액은 월 신규 투자금과 같다", () => {
    const result = calculateMonthlyAllocation({
      assets: [makeAsset({ assetType: "cash", amount: 20_000_000 })],
      targetAllocations: [{ assetType: "growth", targetRatio: 1 }],
      monthlyInvestment: 1_000_000,
      minCashRatio: 0.1
    });

    expect(result.totalAllocated).toBe(1_000_000);
  });
});
