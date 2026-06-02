"use client";

import Link from "next/link";
import { FilePlus2, Play, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { MetricCard } from "@/components/common/metric-card";
import { useAppState } from "@/hooks/use-app-state";
import { getRebalancingDashboardData, runManualRebalancingCheck } from "@/lib/services/rebalancing-service";
import { executeRebalancingPlan } from "@/lib/services/rebalancing-execution-service";
import { acceptRebalancingAcknowledgement } from "@/lib/services/rebalancing-rule-service";
import { completeInvestorProfile } from "@/lib/services/trading-profile-service";
import { ASSET_TYPE_SETTINGS } from "@/lib/constants/asset-types";
import { formatKrw } from "@/lib/utils/currency";
import { formatPercent } from "@/lib/utils/percentage";

export function RebalancingDashboard() {
  const { state, updateState } = useAppState();
  const [message, setMessage] = useState("");
  const data = useMemo(() => getRebalancingDashboardData(state), [state]);

  function prepare() {
    let nextState = completeInvestorProfile(state, {});
    nextState = acceptRebalancingAcknowledgement(
      nextState,
      "manual_rebalancing"
    );
    updateState(nextState);
    setMessage("리밸런싱 분석 조건을 확인했습니다.");
  }

  function generatePlan() {
    const result = runManualRebalancingCheck(state);
    updateState(result.state);
    setMessage(
      result.plan
        ? "리밸런싱 계획을 생성했습니다."
        : result.errors.join(" ") || "리밸런싱 계획을 생성하지 못했습니다."
    );
  }

  function executePaper() {
    const plan = data.latestPlan;
    if (!plan) {
      setMessage("실행할 리밸런싱 계획이 없습니다.");
      return;
    }
    updateState(executeRebalancingPlan(state, plan.id, "paper"));
    setMessage("모의 리밸런싱 실행을 기록했습니다.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-mint">자동 리밸런싱</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">리밸런싱 대시보드</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/rebalancing/settings"
            className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-semibold text-neutral-700"
          >
            설정
          </Link>
          <Link
            href="/rebalancing/history"
            className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-semibold text-neutral-700"
          >
            이력
          </Link>
          <Link
            href="/rebalancing/audit"
            className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-semibold text-neutral-700"
          >
            감사
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="필요 여부"
          value={data.drift.rebalanceNeeded ? "검토 필요" : "범위 내"}
          caption={data.drift.summary}
          tone={data.drift.rebalanceNeeded ? "saffron" : "mint"}
        />
        <MetricCard
          title="최대 드리프트"
          value={formatPercent(data.drift.maxDriftPercent)}
          caption={
            data.drift.maxDriftAssetType
              ? ASSET_TYPE_SETTINGS[data.drift.maxDriftAssetType].label
              : "기준 없음"
          }
        />
        <MetricCard
          title="현재 현금비중"
          value={formatPercent(
            data.drift.currentAllocation.cash ??
              data.drift.currentAllocation.savings ??
              0
          )}
          caption={`목표 ${formatPercent(state.profile.minCashRatio)}`}
        />
        <MetricCard
          title="최근 계획"
          value={data.latestPlan ? data.latestPlan.status : "없음"}
          caption={
            data.latestPlan
              ? formatKrw(data.latestPlan.estimatedTotalTradeAmount)
              : "생성된 계획 없음"
          }
        />
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={prepare}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white"
          >
            <ShieldCheck size={17} aria-hidden="true" />
            조건 확인
          </button>
          <button
            type="button"
            onClick={generatePlan}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white"
          >
            <FilePlus2 size={17} aria-hidden="true" />
            계획 생성
          </button>
          <button
            type="button"
            onClick={executePaper}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-neutral-700"
          >
            <Play size={17} aria-hidden="true" />
            모의 실행
          </button>
          {data.latestPlan ? (
            <Link
              href={`/rebalancing/plans/${data.latestPlan.id}`}
              className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-semibold text-neutral-700"
            >
              최근 계획
            </Link>
          ) : null}
        </div>
        {message ? (
          <p className="mt-4 rounded-md border border-line bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
            {message}
          </p>
        ) : null}
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">자산군 드리프트</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">자산군</th>
                <th className="py-3 pr-3 text-right">현재비중</th>
                <th className="py-3 pr-3 text-right">목표비중</th>
                <th className="py-3 pr-3 text-right">차이</th>
                <th className="py-3 pr-3">상태</th>
              </tr>
            </thead>
            <tbody>
              {data.drift.driftByAssetClass.map((item) => (
                <tr key={item.assetType} className="border-b border-line/70">
                  <td className="py-3 pr-3 font-medium">
                    {ASSET_TYPE_SETTINGS[item.assetType].label}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(item.currentWeight)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(item.targetWeight)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(item.driftPercent)}
                  </td>
                  <td className="py-3 pr-3">
                    {item.status === "underweight"
                      ? "부족"
                      : item.status === "overweight"
                        ? "초과"
                        : "범위 내"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <DisclaimerNote />
    </div>
  );
}
