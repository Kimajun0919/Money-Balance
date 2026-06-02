import { describe, expect, it } from "vitest";
import { calculateRebalancingDrift } from "@/lib/engines/rebalancing-drift-engine";
import { createDefaultState } from "@/lib/storage/default-state";
import { makeAsset } from "../helpers";

describe("rebalancing-drift-engine", () => {
  it("현재비중, 목표비중, 드리프트를 계산하고 현금 비중을 포함한다", () => {
    const state = {
      ...createDefaultState(),
      assets: [makeAsset({ assetType: "cash", amount: 10_000_000 })]
    };
    const result = calculateRebalancingDrift(state);
    const cash = result.driftByAssetClass.find((item) => item.assetType === "cash");

    expect(cash?.currentWeight).toBe(1);
    expect(cash?.targetWeight).toBeGreaterThan(0);
    expect(cash?.absoluteDriftPercent).toBeGreaterThan(0);
    expect(result.rebalanceNeeded).toBe(true);
    expect(result.summary).toContain("리밸런싱");
  });

  it("기준값을 크게 잡으면 리밸런싱 불필요 상태를 반환한다", () => {
    const state = {
      ...createDefaultState(),
      rebalancingPolicies: [
        {
          ...createDefaultState().rebalancingPolicies[0],
          assetClassThresholdPercent: 1,
          driftThresholdPercent: 1
        }
      ],
      assets: [makeAsset({ assetType: "cash", amount: 10_000_000 })]
    };
    const result = calculateRebalancingDrift(state, state.rebalancingPolicies[0]);

    expect(result.rebalanceNeeded).toBe(false);
    expect(result.maxDriftPercent).toBeGreaterThan(0);
  });
});
