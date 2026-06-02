"use client";

import { useState } from "react";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { useAppState } from "@/hooks/use-app-state";

export function RebalancingAuditTable() {
  const { state } = useAppState();
  const [eventType, setEventType] = useState("all");
  const logs = state.rebalancingAuditLogs.filter((log) =>
    eventType === "all" ? true : log.eventType === eventType
  );
  const eventTypes = Array.from(
    new Set(state.rebalancingAuditLogs.map((log) => log.eventType))
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-mint">감사 로그</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">리밸런싱 감사</h1>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-ink">주요 판단 기록</h2>
          <select
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
            className="h-10 rounded-md border border-line px-3 text-sm"
          >
            <option value="all">전체</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          리밸런싱 관련 주요 판단과 실행 기록을 확인합니다.
        </p>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">이벤트</th>
                <th className="py-3 pr-3">대상</th>
                <th className="py-3 pr-3">동의</th>
                <th className="py-3 pr-3">위험 점검</th>
                <th className="py-3 pr-3">시각</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-line/70 align-top">
                  <td className="py-3 pr-3 font-medium">{log.eventType}</td>
                  <td className="py-3 pr-3">
                    {log.entityType} · {log.entityId.slice(0, 12)}
                  </td>
                  <td className="py-3 pr-3 text-neutral-600">
                    {Object.entries(log.userConsentSnapshot)
                      .filter(([, value]) => value)
                      .map(([key]) => key)
                      .join(", ") || "없음"}
                  </td>
                  <td className="py-3 pr-3 text-neutral-600">
                    {log.riskCheckResult?.blockingReasons.join(" ") ||
                      log.riskCheckResult?.warnings.join(" ") ||
                      "기록 없음"}
                  </td>
                  <td className="py-3 pr-3">{log.createdAt.slice(0, 16)}</td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500">
                    감사 로그가 없습니다.
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
