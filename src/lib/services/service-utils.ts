import type {
  AllocationGapStatus,
  AppState,
  PortfolioReview,
  SnapshotItem,
  StoredSnapshot
} from "@/lib/types";

export function createId(prefix = "") {
  const id = crypto.randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}

export function getMonthKey(date: string | Date) {
  const normalized = typeof date === "string" ? new Date(date) : date;
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function sortSnapshotsByDateDesc(snapshots: StoredSnapshot[]) {
  return [...snapshots].sort(
    (a, b) =>
      new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
  );
}

export function getActiveSnapshots(state: AppState) {
  return sortSnapshotsByDateDesc(
    state.snapshots.filter((snapshot) => !snapshot.isArchived)
  );
}

export function buildSnapshotItems(review: PortfolioReview): SnapshotItem[] {
  return review.rebalance.items.map((item) => {
    const allocation = review.targetAllocation.allocations.find(
      (targetItem) => targetItem.assetType === item.assetType
    );
    const minRatio = allocation?.minRatio ?? Math.max(0, item.targetRatio - 0.03);
    const maxRatio = allocation?.maxRatio ?? Math.min(1, item.targetRatio + 0.03);
    const allocationGapStatus: AllocationGapStatus =
      item.currentRatio < minRatio
        ? "below"
        : item.currentRatio > maxRatio
          ? "above"
          : "within";

    return {
      ...item,
      minRatio,
      maxRatio,
      allocationGapStatus
    };
  });
}

export function formatSignedKrwChange(value?: number) {
  if (value === undefined) return "기준 스냅샷 없음";
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(Math.round(value)).toLocaleString("ko-KR")}원`;
}

export function formatSignedPointChange(value?: number) {
  if (value === undefined) return "기준 스냅샷 없음";
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${(Math.abs(value) * 100).toFixed(1)}%p`;
}
