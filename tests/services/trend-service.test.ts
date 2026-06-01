import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/lib/storage/default-state";
import { createMonthlySnapshot } from "@/lib/services/snapshot-service";
import { buildTrendData } from "@/lib/services/trend-service";
import { makeAsset } from "../helpers";

describe("trend-service", () => {
  it("스냅샷이 2개 미만이면 빈 상태를 반환한다", () => {
    const state = createDefaultState();
    const result = buildTrendData(state);

    expect(result.hasEnoughData).toBe(false);
    expect(result.emptyMessage).toContain("충분한 스냅샷");
  });

  it("총자산, 위험점수, 자산군 비중 추이 데이터를 반환한다", () => {
    const base = {
      ...createDefaultState(),
      assets: [makeAsset({ assetType: "cash", amount: 10_000_000 })]
    };
    const first = createMonthlySnapshot(base, { snapshotDate: "2026-04-01" });
    const second = createMonthlySnapshot(
      {
        ...first.state,
        assets: [makeAsset({ assetType: "growth", amount: 20_000_000 })]
      },
      { snapshotDate: "2026-05-01" }
    );
    const result = buildTrendData(second.state, "all");

    expect(result.hasEnoughData).toBe(true);
    expect(result.totalAssets).toHaveLength(2);
    expect(result.riskScore).toHaveLength(2);
    expect(result.allocation).toHaveLength(2);
  });
});
