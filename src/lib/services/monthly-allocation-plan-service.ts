import { ASSET_TYPE_SETTINGS } from "@/lib/constants/asset-types";
import { buildPortfolioReview } from "@/lib/engines/portfolio-review-engine";
import { logKpiEvent } from "@/lib/kpi/event-logger";
import type {
  AppState,
  MonthlyAllocationPlan,
  SuggestionStatus
} from "@/lib/types";
import { createId } from "@/lib/services/service-utils";
import { formatKrw } from "@/lib/utils/currency";

export function saveMonthlyAllocationPlan(
  state: AppState,
  snapshotId?: string
): { state: AppState; plan: MonthlyAllocationPlan } {
  const review = buildPortfolioReview(state.profile, state.assets);
  const excludedAssetTypes = review.returns.illusionWarnings.map(
    (warning) => warning.assetType
  );
  const now = new Date().toISOString();
  const allocationSummary =
    review.monthlyAllocation.items.length > 0
      ? review.monthlyAllocation.items
          .map(
            (item) =>
              `${ASSET_TYPE_SETTINGS[item.assetType].label} ${formatKrw(
                item.amount
              )}`
          )
          .join(", ")
      : "배분 가능한 월 신규 투자금이 없습니다.";
  const plan: MonthlyAllocationPlan = {
    id: createId("plan"),
    snapshotId,
    monthlyInvestmentAmount: state.profile.monthlyInvestment,
    cashFirstAmount: review.monthlyAllocation.cashFirstAllocated,
    remainingInvestmentAmount:
      state.profile.monthlyInvestment - review.monthlyAllocation.cashFirstAllocated,
    allocationData: review.monthlyAllocation.items,
    excludedAssetTypes,
    summary: `이번 달 신규 투자금 배분 참고: ${allocationSummary}`,
    status: "suggested",
    createdAt: now,
    updatedAt: now
  };

  logKpiEvent("monthly_allocation_plan_saved", {
    monthlyInvestmentAmount: plan.monthlyInvestmentAmount,
    snapshotId
  });

  return {
    state: {
      ...state,
      monthlyAllocationPlans: [plan, ...state.monthlyAllocationPlans],
      monthlyReports: state.monthlyReports.map((report) =>
        snapshotId && report.currentSnapshotId === snapshotId
          ? {
              ...report,
              detailJson: {
                ...report.detailJson,
                monthlyAllocationPlanIds: [
                  plan.id,
                  ...report.detailJson.monthlyAllocationPlanIds
                ]
              },
              updatedAt: now
            }
          : report
      )
    },
    plan
  };
}

export function updateMonthlyAllocationPlanStatus(
  state: AppState,
  planId: string,
  status: SuggestionStatus
): AppState {
  return {
    ...state,
    monthlyAllocationPlans: state.monthlyAllocationPlans.map((plan) =>
      plan.id === planId
        ? { ...plan, status, updatedAt: new Date().toISOString() }
        : plan
    )
  };
}
