"use client";

import { useEffect, useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ASSET_TYPE_SETTINGS } from "@/lib/constants/asset-types";
import { buildPortfolioReview } from "@/lib/engines/portfolio-review-engine";
import { logKpiEvent } from "@/lib/kpi/event-logger";
import { useAppState } from "@/hooks/use-app-state";
import { formatKrw } from "@/lib/utils/currency";
import { formatPercent } from "@/lib/utils/percentage";

export function RebalanceClient() {
  const { state, loaded } = useAppState();
  const review = useMemo(
    () => buildPortfolioReview(state.profile, state.assets),
    [state]
  );
  const negativeAdjustments = review.rebalance.items.filter(
    (item) => item.adjustmentAmount < 0
  );

  useEffect(() => {
    if (!loaded) return;
    logKpiEvent("rebalance_suggestion_viewed", {
      primaryStatus: review.rebalance.primaryStatus
    });
    logKpiEvent("monthly_allocation_calculated", {
      monthlyInvestment: state.profile.monthlyInvestment
    });
  }, [loaded, review.rebalance.primaryStatus, state.profile.monthlyInvestment]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-mint">리밸런싱</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">
          자산군 기준 조정 참고
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="우선 상태"
          value={<StatusBadge status={review.rebalance.primaryStatus} />}
          caption={review.rebalance.priorityAction}
          tone={
            review.rebalance.primaryStatus === "risk_excess" ||
            review.rebalance.primaryStatus === "illusion_warning"
              ? "berry"
              : review.rebalance.primaryStatus === "cash_shortage"
                ? "saffron"
                : "neutral"
          }
        />
        <MetricCard
          title="월 신규 투자금"
          value={formatKrw(state.profile.monthlyInvestment)}
          caption={`계산 배분액 ${formatKrw(
            review.monthlyAllocation.totalAllocated
          )}`}
        />
        <MetricCard
          title="현금 우선 배분"
          value={formatKrw(review.monthlyAllocation.cashFirstAllocated)}
          caption={`현금 부족액 ${formatKrw(
            review.monthlyAllocation.cashShortageAmount
          )}`}
          tone={review.monthlyAllocation.cashFirstAllocated > 0 ? "saffron" : "neutral"}
        />
        <MetricCard
          title="위험점수"
          value={`${review.risk.totalScore.toFixed(1)}점`}
          caption={`상한 ${state.profile.riskScoreLimit}점`}
        />
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-ink">활성 상태</h2>
          <div className="flex flex-wrap gap-2">
            {review.rebalance.activeFlags.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          모든 항목은 자산군 기준 참고 금액입니다. 특정 상품 단위 실행 지시는 제공하지 않습니다.
        </p>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">월 신규 투자금 배분</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">자산군</th>
                <th className="py-3 pr-3">단계</th>
                <th className="py-3 pr-3 text-right">배분 금액</th>
                <th className="py-3 pr-3 text-right">가중치</th>
                <th className="py-3 pr-3">사유</th>
              </tr>
            </thead>
            <tbody>
              {review.monthlyAllocation.items.map((item, index) => (
                <tr
                  key={`${item.assetType}-${item.step}-${index}`}
                  className="border-b border-line/70"
                >
                  <td className="py-3 pr-3 font-medium">
                    {ASSET_TYPE_SETTINGS[item.assetType].label}
                  </td>
                  <td className="py-3 pr-3">
                    {item.step === "cash_first"
                      ? "현금 우선"
                      : item.step === "shortage_weighted"
                        ? "부족 비중"
                        : "대기 현금"}
                  </td>
                  <td className="py-3 pr-3 text-right font-semibold">
                    {formatKrw(item.amount)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(item.weight)}
                  </td>
                  <td className="py-3 pr-3 text-neutral-600">{item.reason}</td>
                </tr>
              ))}
              {review.monthlyAllocation.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500">
                    월 신규 투자금이 입력되지 않았습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">자산군별 조정 금액</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">자산군</th>
                <th className="py-3 pr-3 text-right">현재비중</th>
                <th className="py-3 pr-3 text-right">목표비중</th>
                <th className="py-3 pr-3 text-right">부족·초과 금액</th>
                <th className="py-3 pr-3">상태</th>
              </tr>
            </thead>
            <tbody>
              {review.rebalance.items.map((item) => (
                <tr key={item.assetType} className="border-b border-line/70">
                  <td className="py-3 pr-3 font-medium">
                    {ASSET_TYPE_SETTINGS[item.assetType].label}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(item.currentRatio)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(item.targetRatio)}
                  </td>
                  <td
                    className={`py-3 pr-3 text-right font-semibold ${
                      item.adjustmentAmount < 0 ? "text-rose-700" : "text-mint"
                    }`}
                  >
                    {formatKrw(item.adjustmentAmount)}
                  </td>
                  <td className="py-3 pr-3">
                    {item.hasAllocationGap ? (
                      <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
                        확인 필요
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm text-neutral-600">
                        <CheckCircle2 size={15} aria-hidden="true" />
                        허용 범위
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">초과 자산군 참고 금액</h2>
        {negativeAdjustments.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {negativeAdjustments.map((item) => (
              <div
                key={item.assetType}
                className="rounded-md border border-line bg-neutral-50 p-4"
              >
                <p className="font-semibold text-ink">
                  {ASSET_TYPE_SETTINGS[item.assetType].label}
                </p>
                <p className="mt-2 text-sm text-neutral-600">
                  목표비중보다 {formatKrw(Math.abs(item.adjustmentAmount))} 높게
                  입력되어 있습니다.
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-neutral-600">
            목표비중보다 높은 자산군이 없습니다.
          </p>
        )}
      </section>

      <DisclaimerNote />
    </div>
  );
}
