"use client";

import { useEffect, useMemo, useState } from "react";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { StatusBadge } from "@/components/common/status-badge";
import { logKpiEvent } from "@/lib/kpi/event-logger";
import {
  listRebalanceSuggestions,
  updateRebalanceSuggestionStatus
} from "@/lib/services/rebalance-history-service";
import type { RebalanceStatus, SuggestionStatus } from "@/lib/types";
import { useAppState } from "@/hooks/use-app-state";
import {
  STATUS_LABELS,
  SUGGESTION_STATUS_LABELS
} from "@/lib/utils/labels";
import { formatPercent } from "@/lib/utils/percentage";

const statusOptions: Array<SuggestionStatus | "all"> = [
  "all",
  "suggested",
  "viewed",
  "deferred",
  "applied"
];
const typeOptions: Array<RebalanceStatus | "all"> = [
  "all",
  "cash_shortage",
  "risk_excess",
  "illusion_warning",
  "allocation_gap",
  "return_gap",
  "maintain"
];

export function RebalanceHistoryClient() {
  const { state, updateState, loaded } = useAppState();
  const [status, setStatus] = useState<SuggestionStatus | "all">("all");
  const [type, setType] = useState<RebalanceStatus | "all">("all");
  const suggestions = useMemo(
    () =>
      listRebalanceSuggestions(state, {
        status,
        suggestionType: type
      }),
    [state, status, type]
  );

  useEffect(() => {
    if (loaded) logKpiEvent("rebalance_history_viewed");
  }, [loaded]);

  function updateStatus(id: string, nextStatus: SuggestionStatus) {
    updateState(updateRebalanceSuggestionStatus(state, id, nextStatus));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-mint">리밸런싱 이력</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">
          월별 제안과 처리 상태
        </h1>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">제안 유형</span>
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as RebalanceStatus | "all")
              }
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
            >
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "전체" : STATUS_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">상태</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as SuggestionStatus | "all")
              }
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "전체" : SUGGESTION_STATUS_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">제안 목록</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">일시</th>
                <th className="py-3 pr-3">유형</th>
                <th className="py-3 pr-3 text-right">목표수익률</th>
                <th className="py-3 pr-3 text-right">현재 기대수익률</th>
                <th className="py-3 pr-3 text-right">위험점수</th>
                <th className="py-3 pr-3 text-right">현금성 비중</th>
                <th className="py-3 pr-3">상태</th>
                <th className="py-3 pr-3 text-right">변경</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((suggestion) => (
                <tr key={suggestion.id} className="border-b border-line/70">
                  <td className="py-3 pr-3">{suggestion.createdAt.slice(0, 10)}</td>
                  <td className="py-3 pr-3">
                    <StatusBadge status={suggestion.suggestionType} />
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(suggestion.targetReturn)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(suggestion.currentExpectedReturn)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {suggestion.riskScore.toFixed(1)}점
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(suggestion.cashRatio)}
                  </td>
                  <td className="py-3 pr-3">
                    {SUGGESTION_STATUS_LABELS[suggestion.status]}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <div className="flex justify-end gap-2">
                      {(["viewed", "deferred", "applied"] as SuggestionStatus[]).map(
                        (nextStatus) => (
                          <button
                            key={nextStatus}
                            type="button"
                            onClick={() => updateStatus(suggestion.id, nextStatus)}
                            className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-neutral-700"
                          >
                            {SUGGESTION_STATUS_LABELS[nextStatus]}
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {suggestions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-500">
                    조건에 맞는 리밸런싱 이력이 없습니다.
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
