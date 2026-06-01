import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/lib/storage/default-state";
import {
  saveMonthlyAllocationPlan,
  updateMonthlyAllocationPlanStatus
} from "@/lib/services/monthly-allocation-plan-service";
import { makeAsset } from "../helpers";

describe("monthly-allocation-plan-service", () => {
  it("월 신규 투자금 배분 결과를 계획으로 저장한다", () => {
    const state = {
      ...createDefaultState(),
      assets: [makeAsset({ assetType: "growth", amount: 10_000_000 })]
    };
    const result = saveMonthlyAllocationPlan(state, "snapshot-1");

    expect(result.plan.snapshotId).toBe("snapshot-1");
    expect(result.plan.cashFirstAmount).toBeGreaterThan(0);
    expect(result.plan.allocationData.length).toBeGreaterThan(0);
  });

  it("배분 계획 상태를 변경할 수 있다", () => {
    const state = {
      ...createDefaultState(),
      assets: [makeAsset({ assetType: "cash", amount: 10_000_000 })]
    };
    const saved = saveMonthlyAllocationPlan(state);
    const updated = updateMonthlyAllocationPlanStatus(
      saved.state,
      saved.plan.id,
      "applied"
    );

    expect(updated.monthlyAllocationPlans[0].status).toBe("applied");
  });
});
