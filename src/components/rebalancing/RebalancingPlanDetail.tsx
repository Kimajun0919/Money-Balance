"use client";

import Link from "next/link";
import { CheckCircle2, Play, Send, XCircle } from "lucide-react";
import { useState } from "react";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { MetricCard } from "@/components/common/metric-card";
import { useAppState } from "@/hooks/use-app-state";
import {
  approveRebalancingPlan,
  rejectRebalancingPlan
} from "@/lib/services/rebalancing-plan-service";
import { executeRebalancingPlan } from "@/lib/services/rebalancing-execution-service";
import { ASSET_TYPE_SETTINGS } from "@/lib/constants/asset-types";
import { formatKrw } from "@/lib/utils/currency";
import { formatPercent } from "@/lib/utils/percentage";

export function RebalancingPlanDetail({ planId }: { planId: string }) {
  const { state, updateState } = useAppState();
  const [message, setMessage] = useState("");
  const plan = state.rebalancingPlans.find((item) => item.id === planId);
  const items = state.rebalancingPlanItems.filter(
    (item) => item.planId === planId
  );

  if (!plan) {
    return (
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h1 className="text-2xl font-bold text-ink">계획을 찾을 수 없습니다</h1>
        <Link href="/rebalancing" className="mt-4 inline-block text-mint">
          대시보드로 이동
        </Link>
      </section>
    );
  }

  function approve() {
    updateState(approveRebalancingPlan(state, planId));
    setMessage("리밸런싱 계획을 승인했습니다.");
  }

  function reject() {
    updateState(rejectRebalancingPlan(state, planId));
    setMessage("리밸런싱 계획을 거절했습니다.");
  }

  function execute(mode: "paper" | "sandbox" | "live_manual") {
    updateState(executeRebalancingPlan(state, planId, mode));
    setMessage(
      mode === "live_manual"
        ? "실거래 주문 제안 생성을 기록했습니다."
        : "리밸런싱 실행을 기록했습니다."
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-mint">리밸런싱 계획</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">{plan.planName}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="상태" value={plan.status} caption={plan.summary} />
        <MetricCard
          title="거래 예정액"
          value={formatKrw(plan.estimatedTotalTradeAmount)}
          caption={`수수료 ${formatKrw(plan.estimatedFeeAmount)}`}
        />
        <MetricCard
          title="예상 현금비중"
          value={formatPercent(plan.estimatedCashRatioAfter)}
          caption={`예상 현금 ${formatKrw(plan.estimatedCashAfter)}`}
        />
        <MetricCard
          title="위험점수"
          value={`${plan.riskScoreAfter.toFixed(1)}점`}
          caption={`이전 ${plan.riskScoreBefore.toFixed(1)}점`}
        />
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={approve}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white"
          >
            <CheckCircle2 size={17} aria-hidden="true" />
            승인
          </button>
          <button
            type="button"
            onClick={reject}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-neutral-700"
          >
            <XCircle size={17} aria-hidden="true" />
            거절
          </button>
          <button
            type="button"
            onClick={() => execute("paper")}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-neutral-700"
          >
            <Play size={17} aria-hidden="true" />
            모의 실행
          </button>
          <button
            type="button"
            onClick={() => execute("sandbox")}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-neutral-700"
          >
            <Send size={17} aria-hidden="true" />
            샌드박스
          </button>
          <button
            type="button"
            onClick={() => execute("live_manual")}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-neutral-700"
          >
            <Send size={17} aria-hidden="true" />
            실거래 제안
          </button>
          <Link
            href={`/rebalancing/execute/${planId}`}
            className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-semibold text-neutral-700"
          >
            실행 검토
          </Link>
        </div>
        {message ? (
          <p className="mt-4 rounded-md border border-line bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
            {message}
          </p>
        ) : null}
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">주문 항목</h2>
        <p className="mt-2 text-sm text-neutral-600">
          이 계획은 목표비중과 현재비중의 차이를 줄이기 위한 리밸런싱 제안입니다.
        </p>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">자산군</th>
                <th className="py-3 pr-3">구분</th>
                <th className="py-3 pr-3 text-right">현재</th>
                <th className="py-3 pr-3 text-right">목표</th>
                <th className="py-3 pr-3 text-right">금액</th>
                <th className="py-3 pr-3">상태</th>
                <th className="py-3 pr-3">위험/차단</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-line/70">
                  <td className="py-3 pr-3 font-medium">
                    {ASSET_TYPE_SETTINGS[item.assetType].label}
                  </td>
                  <td className="py-3 pr-3">
                    {item.side === "buy"
                      ? "매수"
                      : item.side === "sell"
                        ? "매도"
                        : "유지"}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(item.currentWeight)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(item.targetWeight)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatKrw(item.proposedAmount)}
                  </td>
                  <td className="py-3 pr-3">{item.status}</td>
                  <td className="py-3 pr-3 text-neutral-600">
                    {[...item.riskWarnings, ...item.blockingReasons].join(" ") ||
                      "통과"}
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
