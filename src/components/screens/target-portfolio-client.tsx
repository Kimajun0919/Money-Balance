"use client";

import { useEffect, useMemo } from "react";
import { AllocationChart } from "@/components/charts/allocation-chart";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { MetricCard } from "@/components/common/metric-card";
import { ASSET_TYPE_SETTINGS } from "@/lib/constants/asset-types";
import { buildPortfolioReview } from "@/lib/engines/portfolio-review-engine";
import { logKpiEvent } from "@/lib/kpi/event-logger";
import { useAppState } from "@/hooks/use-app-state";
import { formatKrw } from "@/lib/utils/currency";
import { formatPercent, formatPoint } from "@/lib/utils/percentage";

export function TargetPortfolioClient() {
  const { state, loaded } = useAppState();
  const review = useMemo(
    () => buildPortfolioReview(state.profile, state.assets),
    [state]
  );

  useEffect(() => {
    if (loaded) logKpiEvent("target_allocation_viewed");
  }, [loaded]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-mint">목표 포트폴리오</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">
          목표배분과 현재비중 비교
        </h1>
      </div>

      {review.targetAllocation.blocked ? (
        <section className="rounded-md border border-rose-200 bg-rose-50 p-5 text-rose-900 shadow-panel">
          {review.targetAllocation.blockReason}
        </section>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() =>
                logKpiEvent("target_gap_card_clicked", {
                  targetGap: review.targetAllocation.targetGap
                })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  logKpiEvent("target_gap_card_clicked", {
                    targetGap: review.targetAllocation.targetGap
                  });
                }
              }}
              className="text-left"
            >
              <MetricCard
                title="목표 괴리"
                value={formatPoint(review.targetAllocation.targetGap)}
                caption={`목표 ${formatPercent(
                  state.profile.targetReturn
                )}, 기준 기대 ${formatPercent(
                  review.targetAllocation.expectedReturn
                )}`}
                tone={review.targetAllocation.targetGap > 0 ? "saffron" : "mint"}
              />
            </div>
            <MetricCard
              title="적용 목표 밴드"
              value={formatPercent(review.targetAllocation.mappedBand)}
              caption="가장 가까운 목표수익률 기준 배분표"
            />
            <MetricCard
              title="구성 위험점수"
              value={`${review.targetAllocation.compositionRisk}점`}
              caption="목표배분 자체의 위험 수준"
            />
            <MetricCard
              title="현재 총자산"
              value={formatKrw(review.returns.totalAssetAmountKrw)}
              caption={`${state.assets.length}개 자산 입력 기준`}
            />
          </div>

          {review.targetAllocation.warnings.length > 0 ? (
            <div className="space-y-2">
              {review.targetAllocation.warnings.map((warning) => (
                <p
                  key={warning}
                  className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                >
                  {warning}
                </p>
              ))}
            </div>
          ) : null}

          <section className="rounded-md border border-line bg-white p-5 shadow-panel">
            <h2 className="text-lg font-bold text-ink">
              자산군별 현재비중과 목표비중
            </h2>
            <div className="mt-4">
              <AllocationChart items={review.rebalance.items} />
            </div>
          </section>

          <section className="rounded-md border border-line bg-white p-5 shadow-panel">
            <h2 className="text-lg font-bold text-ink">조정 필요 금액</h2>
            <div className="table-scroll mt-4 overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-neutral-500">
                    <th className="py-3 pr-3">자산군</th>
                    <th className="py-3 pr-3 text-right">현재금액</th>
                    <th className="py-3 pr-3 text-right">현재비중</th>
                    <th className="py-3 pr-3 text-right">목표비중</th>
                    <th className="py-3 pr-3 text-right">목표금액</th>
                    <th className="py-3 pr-3 text-right">조정 필요 금액</th>
                  </tr>
                </thead>
                <tbody>
                  {review.rebalance.items.map((item) => (
                    <tr key={item.assetType} className="border-b border-line/70">
                      <td className="py-3 pr-3 font-medium">
                        {ASSET_TYPE_SETTINGS[item.assetType].label}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        {formatKrw(item.currentAmount)}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        {formatPercent(item.currentRatio)}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        {formatPercent(item.targetRatio)}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        {formatKrw(item.targetAmount)}
                      </td>
                      <td
                        className={`py-3 pr-3 text-right font-semibold ${
                          item.adjustmentAmount < 0
                            ? "text-rose-700"
                            : "text-mint"
                        }`}
                      >
                        {formatKrw(item.adjustmentAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <DisclaimerNote />
    </div>
  );
}
