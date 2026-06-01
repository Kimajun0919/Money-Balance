import { ASSET_TYPE_SETTINGS } from "@/lib/constants/asset-types";
import { logKpiEvent } from "@/lib/kpi/event-logger";
import type {
  AppState,
  MonthlyReport,
  MonthlyReportDetail,
  StoredSnapshot
} from "@/lib/types";
import { formatKrw } from "@/lib/utils/currency";
import { formatPercent, formatPoint, roundTo } from "@/lib/utils/percentage";
import { createId, getActiveSnapshots, getMonthKey } from "@/lib/services/service-utils";

function findPreviousSnapshot(
  snapshots: StoredSnapshot[],
  currentSnapshot: StoredSnapshot
) {
  return snapshots
    .filter(
      (snapshot) =>
        !snapshot.isArchived &&
        snapshot.id !== currentSnapshot.id &&
        new Date(snapshot.snapshotDate).getTime() <
          new Date(currentSnapshot.snapshotDate).getTime()
    )
    .sort(
      (a, b) =>
        new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
    )[0];
}

function calculateChange(current: number, previous?: number) {
  if (previous === undefined) return undefined;
  return roundTo(current - previous, 6);
}

function calculateChangeRate(current: number, previous?: number) {
  if (previous === undefined || previous === 0) return undefined;
  return roundTo((current - previous) / previous, 6);
}

function buildReportMessages(params: {
  current: StoredSnapshot;
  previous?: StoredSnapshot;
  totalAssetChangeAmount?: number;
  expectedReturnChange?: number;
  riskScoreChange?: number;
  cashRatioChange?: number;
}) {
  const messages: string[] = [];

  if (!params.previous) {
    messages.push(
      "이번 리포트는 첫 번째 기준 스냅샷입니다. 다음 스냅샷부터 전월 대비 변화가 함께 표시됩니다."
    );
    return messages;
  }

  if (params.totalAssetChangeAmount !== undefined) {
    const direction = params.totalAssetChangeAmount >= 0 ? "증가" : "감소";
    messages.push(
      `이번 달 총자산은 이전 스냅샷 대비 ${formatKrw(
        Math.abs(params.totalAssetChangeAmount)
      )} ${direction}했습니다.`
    );
  }

  if (params.expectedReturnChange !== undefined) {
    const direction = params.expectedReturnChange >= 0 ? "상승" : "하락";
    messages.push(
      `포트폴리오 기대수익률은 이전 스냅샷 대비 ${formatPoint(
        Math.abs(params.expectedReturnChange)
      )} ${direction}했습니다.`
    );
  }

  if (params.riskScoreChange !== undefined) {
    const direction = params.riskScoreChange >= 0 ? "상승" : "하락";
    messages.push(
      `위험점수는 이전 스냅샷보다 ${Math.abs(
        params.riskScoreChange
      ).toFixed(1)}점 ${direction}했습니다. 목표수익률 관리 과정에서 위험 노출을 함께 확인해야 합니다.`
    );
  }

  if (params.current.cashRatio < 0.05 || params.cashRatioChange !== undefined) {
    messages.push(
      `현재 현금성 자산 비중은 ${formatPercent(
        params.current.cashRatio
      )}입니다. 최소 기준과 비교해 신규 투자금 배분 순서를 확인해야 합니다.`
    );
  }

  return messages;
}

function buildAllocationChanges(
  current: StoredSnapshot,
  previous?: StoredSnapshot
) {
  return current.items.map((item) => {
    const previousItem = previous?.items.find(
      (candidate) => candidate.assetType === item.assetType
    );
    return {
      assetType: item.assetType,
      currentRatio: item.currentRatio,
      previousRatio: previousItem?.currentRatio,
      change:
        previousItem !== undefined
          ? roundTo(item.currentRatio - previousItem.currentRatio, 6)
          : undefined
    };
  });
}

export function generateMonthlyReport(
  state: AppState,
  currentSnapshotId: string
): { state: AppState; report: MonthlyReport } {
  const current = state.snapshots.find(
    (snapshot) => snapshot.id === currentSnapshotId
  );
  if (!current) {
    throw new Error("월간 리포트를 생성할 스냅샷을 찾을 수 없습니다.");
  }

  const previous = findPreviousSnapshot(getActiveSnapshots(state), current);
  const totalAssetChangeAmount = calculateChange(
    current.totalAssetAmountKrw,
    previous?.totalAssetAmountKrw
  );
  const totalAssetChangeRate = calculateChangeRate(
    current.totalAssetAmountKrw,
    previous?.totalAssetAmountKrw
  );
  const expectedReturnChange = calculateChange(
    current.portfolioExpectedReturn,
    previous?.portfolioExpectedReturn
  );
  const targetGapChange = calculateChange(current.targetGap, previous?.targetGap);
  const incomeAmountChange = calculateChange(
    current.portfolioIncomeAmount,
    previous?.portfolioIncomeAmount
  );
  const riskScoreChange = calculateChange(
    current.riskScore,
    previous?.riskScore
  );
  const cashRatioChange = calculateChange(current.cashRatio, previous?.cashRatio);
  const messages = buildReportMessages({
    current,
    previous,
    totalAssetChangeAmount,
    expectedReturnChange,
    riskScoreChange,
    cashRatioChange
  });
  const relatedSuggestions = state.rebalanceSuggestions
    .filter((suggestion) => suggestion.snapshotId === current.id)
    .map((suggestion) => suggestion.id);
  const relatedPlans = state.monthlyAllocationPlans
    .filter((plan) => plan.snapshotId === current.id)
    .map((plan) => plan.id);

  const detailJson: MonthlyReportDetail = {
    assetChange: {
      current: current.totalAssetAmountKrw,
      previous: previous?.totalAssetAmountKrw,
      changeAmount: totalAssetChangeAmount,
      changeRate: totalAssetChangeRate
    },
    returnChange: {
      currentExpectedReturn: current.portfolioExpectedReturn,
      previousExpectedReturn: previous?.portfolioExpectedReturn,
      change: expectedReturnChange
    },
    riskChange: {
      currentRiskScore: current.riskScore,
      previousRiskScore: previous?.riskScore,
      change: riskScoreChange
    },
    allocationChanges: buildAllocationChanges(current, previous),
    illusionWarningCount: state.rebalanceSuggestions.filter(
      (suggestion) =>
        suggestion.snapshotId === current.id &&
        suggestion.suggestionType === "illusion_warning"
    ).length,
    rebalancingSuggestionIds: relatedSuggestions,
    monthlyAllocationPlanIds: relatedPlans,
    messages
  };
  const existingReport = state.monthlyReports.find(
    (report) => report.currentSnapshotId === current.id
  );
  const now = new Date().toISOString();
  const report: MonthlyReport = {
    id: existingReport?.id ?? createId("report"),
    currentSnapshotId: current.id,
    previousSnapshotId: previous?.id,
    reportMonth: getMonthKey(current.snapshotDate),
    totalAssetChangeAmount,
    totalAssetChangeRate,
    expectedReturnChange,
    targetGapChange,
    incomeAmountChange,
    riskScoreChange,
    cashRatioChange,
    summary: messages.join(" "),
    detailJson,
    createdAt: existingReport?.createdAt ?? now,
    updatedAt: now
  };
  const monthlyReports = existingReport
    ? state.monthlyReports.map((item) =>
        item.id === existingReport.id ? report : item
      )
    : [report, ...state.monthlyReports];

  logKpiEvent("monthly_report_created", {
    reportMonth: report.reportMonth,
    currentSnapshotId: current.id
  });

  return {
    state: {
      ...state,
      monthlyReports
    },
    report
  };
}

export function getReportList(state: AppState) {
  return [...state.monthlyReports].sort((a, b) =>
    b.reportMonth.localeCompare(a.reportMonth)
  );
}

export function getReportDetail(state: AppState, reportId: string) {
  return state.monthlyReports.find((report) => report.id === reportId);
}

export function getReportInterpretation(report: MonthlyReport) {
  const allocationMessages = report.detailJson.allocationChanges
    .filter((change) => change.change !== undefined)
    .map((change) => {
      const label = ASSET_TYPE_SETTINGS[change.assetType].label;
      return `${label} 비중 변화 ${formatPoint(change.change ?? 0)}`;
    });

  return [report.summary, ...allocationMessages].filter(Boolean);
}
