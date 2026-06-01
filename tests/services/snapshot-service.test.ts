import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/lib/storage/default-state";
import { createMonthlySnapshot } from "@/lib/services/snapshot-service";
import { makeAsset } from "../helpers";

function stateWithAssets() {
  return {
    ...createDefaultState(),
    assets: [
      makeAsset({ assetType: "cash", amount: 10_000_000 }),
      makeAsset({ assetType: "growth", amount: 20_000_000 })
    ]
  };
}

describe("snapshot-service", () => {
  it("스냅샷 생성 시 계산 지표와 자산군 항목을 저장한다", () => {
    const result = createMonthlySnapshot(stateWithAssets(), {
      snapshotDate: "2026-05-10",
      source: "manual"
    });

    expect(result.snapshot?.totalAssetAmountKrw).toBe(30_000_000);
    expect(result.snapshot?.referencePortfolioExpectedReturn).toBeGreaterThan(0);
    expect(result.snapshot?.items.length).toBeGreaterThan(0);
    expect(result.snapshot?.items[0].allocationGapStatus).toBeDefined();
    expect(result.snapshot?.snapshotSource).toBe("manual");
  });

  it("같은 달 스냅샷이 있으면 중복 정책을 요청한다", () => {
    const first = createMonthlySnapshot(stateWithAssets(), {
      snapshotDate: "2026-05-10"
    });
    const second = createMonthlySnapshot(first.state, {
      snapshotDate: "2026-05-20"
    });

    expect(second.duplicateSnapshot?.id).toBe(first.snapshot?.id);
    expect(second.snapshot).toBeUndefined();
  });

  it("같은 달 스냅샷 교체 시 이전 스냅샷을 보관 상태로 바꾼다", () => {
    const first = createMonthlySnapshot(stateWithAssets(), {
      snapshotDate: "2026-05-10"
    });
    const second = createMonthlySnapshot(first.state, {
      snapshotDate: "2026-05-20",
      duplicatePolicy: "replace"
    });
    const archived = second.state.snapshots.find(
      (snapshot) => snapshot.id === first.snapshot?.id
    );

    expect(archived?.isArchived).toBe(true);
    expect(archived?.replacedBySnapshotId).toBe(second.snapshot?.id);
  });
});
