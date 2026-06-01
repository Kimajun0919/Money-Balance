import { describe, expect, it } from "vitest";
import { calculateTargetAllocation } from "@/lib/engines/target-allocation-engine";

describe("target-allocation-engine", () => {
  it("10% 목표, 중립형은 기준 기대수익률 8.3%와 구성위험 68을 반환한다", () => {
    const result = calculateTargetAllocation({
      targetReturn: 0.1,
      riskTolerance: "moderate",
      minCashRatio: 0
    });

    expect(result.blocked).toBe(false);
    expect(result.expectedReturn).toBe(0.083);
    expect(result.compositionRisk).toBe(68);
  });

  it("12% 목표, 보수형은 차단된다", () => {
    const result = calculateTargetAllocation({
      targetReturn: 0.12,
      riskTolerance: "conservative",
      minCashRatio: 0.05
    });

    expect(result.blocked).toBe(true);
    expect(result.allocations).toHaveLength(0);
  });

  it("8.5% 목표는 10% 밴드로 매핑된다", () => {
    const result = calculateTargetAllocation({
      targetReturn: 0.085,
      riskTolerance: "moderate",
      minCashRatio: 0
    });

    expect(result.mappedBand).toBe(0.1);
    expect(result.blocked).toBe(false);
  });

  it("최소 현금성 비중이 행렬보다 높으면 비중을 재분배한다", () => {
    const result = calculateTargetAllocation({
      targetReturn: 0.1,
      riskTolerance: "moderate",
      minCashRatio: 0.1
    });
    const cashEquivalentRatio = result.allocations
      .filter((item) => item.assetType === "cash" || item.assetType === "savings")
      .reduce((sum, item) => sum + item.targetRatio, 0);
    const totalRatio = result.allocations.reduce(
      (sum, item) => sum + item.targetRatio,
      0
    );

    expect(result.appliedMinCashAdjustment).toBe(true);
    expect(cashEquivalentRatio).toBeGreaterThanOrEqual(0.1);
    expect(totalRatio).toBeCloseTo(1, 4);
    expect(result.expectedReturn).toBeLessThan(0.083);
  });
});
