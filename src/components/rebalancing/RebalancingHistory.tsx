"use client";

import Link from "next/link";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { useAppState } from "@/hooks/use-app-state";
import { formatKrw } from "@/lib/utils/currency";
import { formatPercent } from "@/lib/utils/percentage";

export function RebalancingHistory() {
  const { state } = useAppState();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-mint">리밸런싱 이력</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">점검과 실행 결과</h1>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">계획 이력</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">계획</th>
                <th className="py-3 pr-3">상태</th>
                <th className="py-3 pr-3 text-right">거래액</th>
                <th className="py-3 pr-3 text-right">현금비중</th>
                <th className="py-3 pr-3">생성일</th>
              </tr>
            </thead>
            <tbody>
              {state.rebalancingPlans.map((plan) => (
                <tr key={plan.id} className="border-b border-line/70">
                  <td className="py-3 pr-3 font-medium">
                    <Link href={`/rebalancing/plans/${plan.id}`} className="text-mint">
                      {plan.planName}
                    </Link>
                  </td>
                  <td className="py-3 pr-3">{plan.status}</td>
                  <td className="py-3 pr-3 text-right">
                    {formatKrw(plan.estimatedTotalTradeAmount)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(plan.estimatedCashRatioAfter)}
                  </td>
                  <td className="py-3 pr-3">{plan.createdAt.slice(0, 16)}</td>
                </tr>
              ))}
              {state.rebalancingPlans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500">
                    계획 이력이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">실행과 스케줄러</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="table-scroll overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-neutral-500">
                  <th className="py-3 pr-3">모드</th>
                  <th className="py-3 pr-3">상태</th>
                  <th className="py-3 pr-3 text-right">주문</th>
                  <th className="py-3 pr-3">시각</th>
                </tr>
              </thead>
              <tbody>
                {state.rebalancingExecutions.map((execution) => (
                  <tr key={execution.id} className="border-b border-line/70">
                    <td className="py-3 pr-3">{execution.executionMode}</td>
                    <td className="py-3 pr-3">{execution.status}</td>
                    <td className="py-3 pr-3 text-right">
                      {execution.totalOrdersAttempted}
                    </td>
                    <td className="py-3 pr-3">
                      {execution.createdAt.slice(0, 16)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-scroll overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-neutral-500">
                  <th className="py-3 pr-3">실행 유형</th>
                  <th className="py-3 pr-3">상태</th>
                  <th className="py-3 pr-3">결과</th>
                </tr>
              </thead>
              <tbody>
                {state.rebalancingSchedulerRuns.map((run) => (
                  <tr key={run.id} className="border-b border-line/70">
                    <td className="py-3 pr-3">{run.runType}</td>
                    <td className="py-3 pr-3">{run.status}</td>
                    <td className="py-3 pr-3 text-neutral-600">
                      {run.noOpReason ?? run.failureReason ?? run.generatedPlanId ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <DisclaimerNote />
    </div>
  );
}
