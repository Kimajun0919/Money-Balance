import { ASSET_TYPE_SETTINGS } from "@/lib/constants/asset-types";
import type { AppState, PeriodFilter, StoredSnapshot } from "@/lib/types";
import { getActiveSnapshots } from "@/lib/services/service-utils";

export const TREND_EMPTY_MESSAGE =
  "아직 추이를 표시하기에 충분한 스냅샷이 없습니다. 최소 2개 이상의 월간 스냅샷이 저장되면 변화 추이를 확인할 수 있습니다.";

export function filterSnapshotsByPeriod(
  snapshots: StoredSnapshot[],
  period: PeriodFilter
) {
  const sorted = [...snapshots].sort(
    (a, b) =>
      new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
  );

  if (period === "all") return sorted;

  const months = period === "3m" ? 3 : period === "6m" ? 6 : 12;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months + 1);

  return sorted.filter((snapshot) => new Date(snapshot.snapshotDate) >= cutoff);
}

export function buildTrendData(state: AppState, period: PeriodFilter = "6m") {
  const snapshots = filterSnapshotsByPeriod(getActiveSnapshots(state), period);
  const sortedSnapshots = [...snapshots].sort(
    (a, b) =>
      new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
  );

  return {
    hasEnoughData: sortedSnapshots.length >= 2,
    emptyMessage: TREND_EMPTY_MESSAGE,
    totalAssets: sortedSnapshots.map((snapshot) => ({
      date: snapshot.snapshotDate,
      value: snapshot.totalAssetAmountKrw
    })),
    riskScore: sortedSnapshots.map((snapshot) => ({
      date: snapshot.snapshotDate,
      value: snapshot.riskScore
    })),
    expectedReturn: sortedSnapshots.map((snapshot) => ({
      date: snapshot.snapshotDate,
      value: snapshot.portfolioExpectedReturn * 100
    })),
    targetGap: sortedSnapshots.map((snapshot) => ({
      date: snapshot.snapshotDate,
      value: snapshot.targetGap * 100
    })),
    monthlyIncome: sortedSnapshots.map((snapshot) => ({
      date: snapshot.snapshotDate,
      value: snapshot.monthlyIncomeAmount
    })),
    cashRatio: sortedSnapshots.map((snapshot) => ({
      date: snapshot.snapshotDate,
      value: snapshot.cashRatio * 100
    })),
    allocation: sortedSnapshots.map((snapshot) => {
      const row: Record<string, string | number> = {
        date: snapshot.snapshotDate
      };
      snapshot.items.forEach((item) => {
        row[ASSET_TYPE_SETTINGS[item.assetType].label] =
          Math.round(item.currentRatio * 1000) / 10;
      });
      return row;
    })
  };
}
