"use client";

import Link from "next/link";
import { Send, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { MetricCard } from "@/components/common/metric-card";
import { useAppState } from "@/hooks/use-app-state";
import {
  executeRealRebalancingOrders,
  reviewRealRebalancingExecution
} from "@/lib/services/real-rebalancing-execution-service";
import { getAccountFreshnessWarnings } from "@/lib/services/account-freshness-service";
import type { RealRebalancingExecutionMode } from "@/lib/types";

function formatWon(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(value);
}

const modeLabels: Record<RealRebalancingExecutionMode, string> = {
  simulation: "모의 실행",
  sandbox: "샌드박스 주문",
  manual_real_order: "실거래 주문 제안",
  real_order_api: "실거래 주문 제출"
};

export function RealRebalancingExecuteClient({ planId }: { planId: string }) {
  const { state, updateState } = useAppState();
  const [mode, setMode] = useState<RealRebalancingExecutionMode>("simulation");
  const [confirmationText, setConfirmationText] = useState("");
  const [sellOrdersConfirmed, setSellOrdersConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const review = useMemo(
    () =>
      reviewRealRebalancingExecution(state, planId, {
        executionMode: mode,
        confirmationText,
        sellOrdersConfirmed
      }),
    [confirmationText, mode, planId, sellOrdersConfirmed, state]
  );
  const accountWarnings = useMemo(
    () => getAccountFreshnessWarnings(state),
    [state]
  );
  const latestBatch = state.realRebalancingOrderBatches.find(
    (batch) => batch.rebalancingPlanId === planId
  );
  const latestResults = latestBatch
    ? state.realRebalancingOrderResults.filter(
        (result) => result.realRebalancingOrderBatchId === latestBatch.id
      )
    : [];

  function submit() {
    const result = executeRealRebalancingOrders(state, {
      planId,
      executionMode: mode,
      confirmationText,
      sellOrdersConfirmed
    });
    updateState(result.state);
    setMessage(
      result.batch.status === "blocked"
        ? `차단됨: ${result.batch.errorMessage}`
        : `${modeLabels[mode]} 결과를 저장했습니다. 상태: ${result.batch.status}`
    );
  }

  if (!review.plan) {
    return (
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h1 className="text-2xl font-bold text-ink">계획을 찾을 수 없습니다</h1>
        <Link href="/rebalancing" className="mt-4 inline-block text-mint">
          리밸런싱으로 이동
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-mint">실행 검토</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">
          {review.plan.planName}
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="계획 상태"
          value={review.plan.status}
          caption={review.plan.summary}
        />
        <MetricCard
          title="주문 예정액"
          value={formatWon(review.plan.estimatedTotalTradeAmount)}
          caption={`수수료 ${formatWon(review.plan.estimatedFeeAmount)}`}
        />
        <MetricCard
          title="중지 스위치"
          value={review.stopSwitchActive ? "켜짐" : "꺼짐"}
          tone={review.stopSwitchActive ? "berry" : "neutral"}
        />
        <MetricCard
          title="제출 가능"
          value={review.canSubmitRealOrders ? "가능" : "차단"}
          tone={review.canSubmitRealOrders ? "mint" : "saffron"}
        />
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-neutral-700">실행 모드</span>
            <select
              value={mode}
              onChange={(event) =>
                setMode(event.target.value as RealRebalancingExecutionMode)
              }
              className="mt-2 h-10 w-full rounded-md border border-line px-3 text-sm"
            >
              {Object.entries(modeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-neutral-700">
              실거래 확인 문구
            </span>
            <input
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              placeholder={review.confirmationTextRequired}
              className="mt-2 h-10 w-full rounded-md border border-line px-3 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-700 md:col-span-3">
            <input
              type="checkbox"
              checked={sellOrdersConfirmed}
              onChange={(event) => setSellOrdersConfirmed(event.target.checked)}
            />
            매도 주문을 별도로 확인했습니다.
          </label>
          <button
            type="button"
            onClick={submit}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white"
          >
            <Send size={17} aria-hidden="true" />
            실행 저장
          </button>
        </div>
        {message ? (
          <p className="mt-3 text-sm text-neutral-700">{message}</p>
        ) : null}
      </section>

      {review.blockingReasons.length > 0 || review.warnings.length > 0 ? (
        <section className="space-y-2">
          {review.blockingReasons.map((reason) => (
            <p
              key={reason}
              className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
            >
              <ShieldAlert size={16} aria-hidden="true" className="mt-0.5" />
              <span>{reason}</span>
            </p>
          ))}
          {review.warnings.map((warning) => (
            <p
              key={warning}
              className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            >
              {warning}
            </p>
          ))}
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-md border border-line bg-white p-5 shadow-panel">
          <h2 className="text-lg font-bold text-ink">데이터 신선도</h2>
          <div className="mt-4 space-y-2 text-sm">
            {accountWarnings.map((warning) => (
              <p key={warning.id} className="rounded-md border border-line p-3">
                {warning.message}
              </p>
            ))}
            {accountWarnings.length === 0 ? (
              <p className="text-neutral-500">계좌 잔고 경고가 없습니다.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-md border border-line bg-white p-5 shadow-panel">
          <h2 className="text-lg font-bold text-ink">예상 배분 변화</h2>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            {review.plan.driftBeforeJson.slice(0, 6).map((item) => (
              <div key={item.assetType} className="rounded-md border border-line p-3">
                <p className="font-semibold text-ink">{item.assetType}</p>
                <p className="text-neutral-600">
                  현재 {(item.currentWeight * 100).toFixed(1)}% · 목표{" "}
                  {(item.targetWeight * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">주문 목록</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">구분</th>
                <th className="py-3 pr-3">자산군</th>
                <th className="py-3 pr-3 text-right">금액</th>
                <th className="py-3 pr-3 text-right">수량</th>
                <th className="py-3 pr-3 text-right">가격</th>
                <th className="py-3 pr-3">상태</th>
                <th className="py-3 pr-3">차단 사유</th>
              </tr>
            </thead>
            <tbody>
              {review.items.map((item) => (
                <tr key={item.id} className="border-b border-line/70">
                  <td className="py-3 pr-3">
                    {item.side === "buy" ? "매수" : item.side === "sell" ? "매도" : "유지"}
                  </td>
                  <td className="py-3 pr-3 font-medium">{item.assetType}</td>
                  <td className="py-3 pr-3 text-right">
                    {formatWon(item.proposedAmount)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {item.proposedQuantity?.toLocaleString("ko-KR") ?? "-"}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {item.estimatedPrice.toLocaleString("ko-KR")}
                  </td>
                  <td className="py-3 pr-3">{item.status}</td>
                  <td className="py-3 pr-3 text-rose-800">
                    {item.blockingReasons.join(", ") || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {latestBatch ? (
        <section className="rounded-md border border-line bg-white p-5 shadow-panel">
          <h2 className="text-lg font-bold text-ink">최근 실행 결과</h2>
          <p className="mt-2 text-sm text-neutral-600">
            {latestBatch.executionMode} · {latestBatch.status} ·{" "}
            {formatWon(latestBatch.totalOrderAmountKrw)}
          </p>
          <div className="mt-4 space-y-2 text-sm">
            {latestResults.map((result) => (
              <p key={result.id} className="rounded-md border border-line p-3">
                {result.ticker} · {result.side} · {result.status}
                {result.errorMessage ? ` · ${result.errorMessage}` : ""}
              </p>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
