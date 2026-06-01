import { ASSET_TYPE_SETTINGS } from "@/lib/constants/asset-types";
import { buildPortfolioReview } from "@/lib/engines/portfolio-review-engine";
import { logKpiEvent } from "@/lib/kpi/event-logger";
import { generateNotificationsFromSnapshot } from "@/lib/services/notification-service";
import { generateMonthlyReport } from "@/lib/services/report-service";
import {
  buildSnapshotItems,
  createId,
  getMonthKey,
  sortSnapshotsByDateDesc
} from "@/lib/services/service-utils";
import type {
  AppState,
  DuplicateSnapshotPolicy,
  MonthlyReport,
  RebalanceSuggestionRecord,
  SnapshotSource,
  StoredSnapshot
} from "@/lib/types";
import { formatKrw } from "@/lib/utils/currency";
import { formatPercent } from "@/lib/utils/percentage";

export interface SnapshotCreationResult {
  state: AppState;
  snapshot?: StoredSnapshot;
  report?: MonthlyReport;
  duplicateSnapshot?: StoredSnapshot;
  message: string;
}

export function findSnapshotForMonth(state: AppState, date: string | Date) {
  const monthKey = getMonthKey(date);
  return state.snapshots.find(
    (snapshot) =>
      !snapshot.isArchived && getMonthKey(snapshot.snapshotDate) === monthKey
  );
}

function buildRebalanceSuggestion(params: {
  snapshot: StoredSnapshot;
  state: AppState;
}): RebalanceSuggestionRecord {
  const { snapshot, state } = params;
  const primaryStatus = snapshot.primaryStatus;
  const largestAdjustment = [...snapshot.items]
    .filter((item) => item.adjustmentAmount > 0)
    .sort((a, b) => b.adjustmentAmount - a.adjustmentAmount)[0];
  const largestAdjustmentText = largestAdjustment
    ? `${ASSET_TYPE_SETTINGS[largestAdjustment.assetType].label} 자산군이 목표비중 대비 ${formatKrw(
        largestAdjustment.adjustmentAmount
      )} 부족합니다.`
    : "목표비중 대비 큰 부족 자산군이 없습니다.";
  const now = new Date().toISOString();

  return {
    id: createId("suggestion"),
    snapshotId: snapshot.id,
    suggestionType: primaryStatus,
    targetReturn: state.profile.targetReturn,
    currentExpectedReturn: snapshot.portfolioExpectedReturn,
    riskScore: snapshot.riskScore,
    cashRatio: snapshot.cashRatio,
    summary: `월간 스냅샷 기준 상태는 ${primaryStatus}입니다.`,
    detail: `${largestAdjustmentText} 모든 금액은 자산군 기준 참고 정보입니다.`,
    actionData: {
      activeFlags: snapshot.activeFlags,
      items: snapshot.items.map((item) => ({
        assetType: item.assetType,
        currentRatio: item.currentRatio,
        targetRatio: item.targetRatio,
        adjustmentAmount: item.adjustmentAmount
      }))
    },
    status: "suggested",
    createdAt: now,
    updatedAt: now
  };
}

function buildSnapshot(params: {
  state: AppState;
  snapshotDate: string;
  source: SnapshotSource;
}): StoredSnapshot {
  const review = buildPortfolioReview(params.state.profile, params.state.assets);
  if (review.targetAllocation.blocked) {
    throw new Error(
      review.targetAllocation.blockReason ??
        "현재 설정으로는 월간 스냅샷을 생성할 수 없습니다."
    );
  }
  const now = new Date().toISOString();

  return {
    id: createId("snapshot"),
    snapshotDate: params.snapshotDate,
    totalAssetAmountKrw: review.returns.totalAssetAmountKrw,
    targetReturn: params.state.profile.targetReturn,
    referencePortfolioExpectedReturn: review.targetAllocation.expectedReturn,
    portfolioExpectedReturn: review.returns.expectedReturn,
    portfolioIncomeYield: review.returns.incomeYield,
    portfolioIncomeAmount: review.returns.annualIncomeAmount,
    monthlyIncomeAmount: review.returns.monthlyIncomeAmount,
    afterTaxExpectedReturn: review.returns.afterTaxExpectedReturn,
    totalReturn: review.returns.totalReturn,
    riskScore: review.risk.totalScore,
    riskScoreLimit: params.state.profile.riskScoreLimit,
    cashRatio: review.risk.cashRatio,
    compositionRisk: review.targetAllocation.compositionRisk,
    targetGap: review.targetAllocation.targetGap,
    primaryStatus: review.rebalance.primaryStatus,
    activeFlags: review.rebalance.activeFlags,
    snapshotSource: params.source,
    isArchived: false,
    items: buildSnapshotItems(review),
    createdAt: now
  };
}

export function createMonthlySnapshot(
  state: AppState,
  options: {
    snapshotDate?: string;
    source?: SnapshotSource;
    duplicatePolicy?: DuplicateSnapshotPolicy;
  } = {}
): SnapshotCreationResult {
  if (state.assets.length === 0) {
    throw new Error("월간 스냅샷을 저장하려면 자산을 1개 이상 등록해야 합니다.");
  }

  const snapshotDate = options.snapshotDate ?? new Date().toISOString().slice(0, 10);
  const source = options.source ?? "manual";
  const duplicateSnapshot = findSnapshotForMonth(state, snapshotDate);

  if (
    duplicateSnapshot &&
    (!options.duplicatePolicy || options.duplicatePolicy === "cancel")
  ) {
    return {
      state,
      duplicateSnapshot,
      message:
        "이번 달 스냅샷이 이미 있습니다. 새 스냅샷으로 저장하거나 이번 달 기준을 교체할 수 있습니다."
    };
  }

  const review = buildPortfolioReview(state.profile, state.assets);
  const snapshot = buildSnapshot({ state, snapshotDate, source });
  const snapshots =
    duplicateSnapshot && options.duplicatePolicy === "replace"
      ? state.snapshots.map((item) =>
          item.id === duplicateSnapshot.id
            ? {
                ...item,
                isArchived: true,
                replacedBySnapshotId: snapshot.id
              }
            : item
        )
      : state.snapshots;
  const suggestion = buildRebalanceSuggestion({ snapshot, state });
  let nextState: AppState = {
    ...state,
    snapshots: sortSnapshotsByDateDesc([snapshot, ...snapshots]),
    rebalanceSuggestions: [suggestion, ...state.rebalanceSuggestions]
  };
  const reportResult = generateMonthlyReport(nextState, snapshot.id);
  nextState = reportResult.state;
  nextState = generateNotificationsFromSnapshot({
    state: nextState,
    snapshot,
    review,
    reportId: reportResult.report.id
  });

  if (duplicateSnapshot && options.duplicatePolicy === "replace") {
    logKpiEvent("snapshot_replaced", {
      oldSnapshotId: duplicateSnapshot.id,
      newSnapshotId: snapshot.id
    });
  }

  logKpiEvent("snapshot_created", {
    snapshotId: snapshot.id,
    source,
    totalAssetAmountKrw: snapshot.totalAssetAmountKrw
  });

  return {
    state: nextState,
    snapshot,
    report: reportResult.report,
    message: `월간 스냅샷이 저장되었습니다. 기준 기대수익률은 ${formatPercent(
      snapshot.referencePortfolioExpectedReturn
    )}이고 총자산은 ${formatKrw(snapshot.totalAssetAmountKrw)}입니다.`
  };
}

export function archiveSnapshot(state: AppState, snapshotId: string): AppState {
  return {
    ...state,
    snapshots: state.snapshots.map((snapshot) =>
      snapshot.id === snapshotId ? { ...snapshot, isArchived: true } : snapshot
    )
  };
}

export function getSnapshotDetail(state: AppState, snapshotId: string) {
  return state.snapshots.find((snapshot) => snapshot.id === snapshotId);
}

export function compareSnapshots(
  current: StoredSnapshot,
  previous?: StoredSnapshot
) {
  if (!previous) {
    return {
      hasPrevious: false,
      message: "기준 스냅샷 없음"
    };
  }

  return {
    hasPrevious: true,
    totalAssetChange: current.totalAssetAmountKrw - previous.totalAssetAmountKrw,
    expectedReturnChange:
      current.portfolioExpectedReturn - previous.portfolioExpectedReturn,
    targetGapChange: current.targetGap - previous.targetGap,
    riskScoreChange: current.riskScore - previous.riskScore,
    cashRatioChange: current.cashRatio - previous.cashRatio
  };
}
