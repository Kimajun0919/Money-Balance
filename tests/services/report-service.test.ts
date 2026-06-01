import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/lib/storage/default-state";
import { generateMonthlyReport } from "@/lib/services/report-service";
import { createMonthlySnapshot } from "@/lib/services/snapshot-service";
import { makeAsset } from "../helpers";

describe("report-service", () => {
  it("첫 리포트는 기준 스냅샷 없음 메시지를 포함한다", () => {
    const state = {
      ...createDefaultState(),
      assets: [makeAsset({ assetType: "cash", amount: 10_000_000 })]
    };
    const snapshotResult = createMonthlySnapshot(state, {
      snapshotDate: "2026-04-01"
    });
    const reportResult = generateMonthlyReport(
      snapshotResult.state,
      snapshotResult.snapshot!.id
    );

    expect(reportResult.report.previousSnapshotId).toBeUndefined();
    expect(reportResult.report.summary).toContain("첫 번째 기준 스냅샷");
  });

  it("현재 스냅샷과 이전 스냅샷의 총자산, 기대수익률, 위험점수 변화를 계산한다", () => {
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
    const report = second.report!;

    expect(report.previousSnapshotId).toBe(first.snapshot?.id);
    expect(report.totalAssetChangeAmount).toBe(10_000_000);
    expect(report.expectedReturnChange).toBeDefined();
    expect(report.riskScoreChange).toBeDefined();
    expect(report.targetGapChange).toBeDefined();
  });
});
