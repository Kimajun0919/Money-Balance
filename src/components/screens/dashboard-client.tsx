"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import {
  AlertTriangle,
  BadgePercent,
  CircleDollarSign,
  PiggyBank,
  Save,
  ShieldAlert,
  TrendingUp
} from "lucide-react";
import { AllocationChart } from "@/components/charts/allocation-chart";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ASSET_TYPE_SETTINGS } from "@/lib/constants/asset-types";
import { buildPortfolioReview } from "@/lib/engines/portfolio-review-engine";
import { logKpiEvent } from "@/lib/kpi/event-logger";
import {
  createSnapshotFromState
} from "@/lib/storage/portfolio-storage";
import { useAppState } from "@/hooks/use-app-state";
import { formatKrw } from "@/lib/utils/currency";
import {
  formatPercent,
  formatPoint
} from "@/lib/utils/percentage";
import { ILLUSION_LEVEL_LABELS, RISK_GRADE_LABELS } from "@/lib/utils/labels";

export function DashboardClient() {
  const { state, updateState, loaded } = useAppState();
  const review = useMemo(
    () => buildPortfolioReview(state.profile, state.assets),
    [state]
  );
  const latestSnapshot = state.snapshots[0];

  useEffect(() => {
    if (loaded) logKpiEvent("dashboard_viewed");
  }, [loaded]);

  function saveSnapshot() {
    const snapshot = createSnapshotFromState(state);
    updateState({
      ...state,
      snapshots: [snapshot, ...state.snapshots]
    });
    logKpiEvent("snapshot_created", {
      snapshotDate: snapshot.snapshotDate,
      totalAssetAmountKrw: snapshot.totalAssetAmountKrw
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-mint">대시보드</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">
            {state.profile.name}님의 포트폴리오 점검
          </h1>
        </div>
        <button
          type="button"
          onClick={saveSnapshot}
          disabled={state.assets.length === 0}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          <Save size={17} aria-hidden="true" />
          스냅샷 저장
        </button>
      </div>

      {state.assets.length === 0 ? (
        <section className="rounded-md border border-line bg-white p-6 text-center shadow-panel">
          <h2 className="text-xl font-bold text-ink">자산 입력이 필요합니다</h2>
          <p className="mt-2 text-sm text-neutral-600">
            수동 자산을 1개 이상 등록하면 목표배분, 기대수익률, 위험점수,
            월 신규 투자금 배분을 계산합니다.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link
              href="/onboarding"
              className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-neutral-700"
            >
              설정 확인
            </Link>
            <Link
              href="/assets"
              className="rounded-md bg-mint px-4 py-2 text-sm font-semibold text-white"
            >
              자산 등록
            </Link>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="총자산"
          value={formatKrw(review.returns.totalAssetAmountKrw)}
          caption={
            latestSnapshot
              ? `최근 저장일 ${latestSnapshot.snapshotDate}`
              : "직전 기준 없음"
          }
          icon={<CircleDollarSign size={20} aria-hidden="true" />}
        />
        <MetricCard
          title="목표수익률과 기준 기대수익률"
          value={`${formatPercent(state.profile.targetReturn)} / ${formatPercent(
            review.targetAllocation.expectedReturn
          )}`}
          caption={`목표 괴리 ${formatPoint(review.targetAllocation.targetGap)}`}
          tone={review.targetAllocation.targetGap > 0 ? "saffron" : "mint"}
          icon={<TrendingUp size={20} aria-hidden="true" />}
        />
        <MetricCard
          title="현재 포트폴리오 기대수익률"
          value={formatPercent(review.returns.expectedReturn)}
          caption={`세후 참고 ${formatPercent(
            review.returns.afterTaxExpectedReturn
          )}, 총수익률 ${formatPercent(review.returns.totalReturn)}`}
          icon={<BadgePercent size={20} aria-hidden="true" />}
        />
        <MetricCard
          title="위험점수"
          value={`${review.risk.totalScore.toFixed(1)}점`}
          caption={`등급 ${RISK_GRADE_LABELS[review.risk.grade]}, 상한 ${state.profile.riskScoreLimit}점`}
          tone={review.risk.exceedsLimit ? "berry" : "neutral"}
          icon={<ShieldAlert size={20} aria-hidden="true" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="인컴수익률"
          value={formatPercent(review.returns.incomeYield)}
          caption={`연 ${formatKrw(
            review.returns.annualIncomeAmount
          )}, 월평균 ${formatKrw(review.returns.monthlyIncomeAmount)}`}
          icon={<PiggyBank size={20} aria-hidden="true" />}
        />
        <MetricCard
          title="현금성 자산 비중"
          value={formatPercent(review.risk.cashRatio)}
          caption={`최소 기준 ${formatPercent(state.profile.minCashRatio)}`}
          tone={
            review.risk.cashRatio < state.profile.minCashRatio
              ? "saffron"
              : "neutral"
          }
        />
        <MetricCard
          title="기본 상태"
          value={<StatusBadge status={review.rebalance.primaryStatus} />}
          caption={review.rebalance.priorityAction}
        />
        <MetricCard
          title="고분배 착시 경고"
          value={`${review.returns.illusionWarnings.length}건`}
          caption={
            review.returns.illusionWarnings.length > 0
              ? "인컴수익률과 총수익률을 함께 확인해야 합니다."
              : "현재 입력값 기준 경고 없음"
          }
          tone={review.returns.illusionWarnings.length > 0 ? "berry" : "neutral"}
          icon={<AlertTriangle size={20} aria-hidden="true" />}
        />
      </div>

      {review.targetAllocation.warnings.length > 0 ? (
        <section className="space-y-2">
          {review.targetAllocation.warnings.map((warning) => (
            <p
              key={warning}
              className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            >
              {warning}
            </p>
          ))}
        </section>
      ) : null}

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-ink">현재비중과 목표비중</h2>
          <div className="flex flex-wrap gap-2">
            {review.rebalance.activeFlags.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </div>
        <div className="mt-4">
          <AllocationChart items={review.rebalance.items} />
        </div>
      </section>

      {review.returns.illusionWarnings.length > 0 ? (
        <section className="rounded-md border border-rose-200 bg-rose-50 p-5 shadow-panel">
          <h2 className="text-lg font-bold text-rose-950">
            고분배 착시 확인
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {review.returns.illusionWarnings.map((warning) => (
              <div
                key={warning.assetId}
                className="rounded-md border border-rose-200 bg-white p-4"
              >
                <p className="font-semibold text-ink">{warning.assetName}</p>
                <p className="mt-1 text-sm text-neutral-600">
                  {ASSET_TYPE_SETTINGS[warning.assetType].label} ·{" "}
                  {ILLUSION_LEVEL_LABELS[warning.level]}
                </p>
                <p className="mt-2 text-sm text-rose-900">{warning.message}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">스냅샷 기록</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">저장일</th>
                <th className="py-3 pr-3 text-right">총자산</th>
                <th className="py-3 pr-3 text-right">기대수익률</th>
                <th className="py-3 pr-3 text-right">위험점수</th>
                <th className="py-3 pr-3">상태</th>
              </tr>
            </thead>
            <tbody>
              {state.snapshots.map((snapshot) => (
                <tr key={snapshot.id} className="border-b border-line/70">
                  <td className="py-3 pr-3">{snapshot.snapshotDate}</td>
                  <td className="py-3 pr-3 text-right">
                    {formatKrw(snapshot.totalAssetAmountKrw)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(snapshot.portfolioExpectedReturn)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {snapshot.riskScore.toFixed(1)}점
                  </td>
                  <td className="py-3 pr-3">
                    <StatusBadge status={snapshot.primaryStatus} />
                  </td>
                </tr>
              ))}
              {state.snapshots.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500">
                    직전 기준 없음
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <DisclaimerNote />
    </div>
  );
}
