"use client";

import { useMemo, useState } from "react";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { useAppState } from "@/hooks/use-app-state";
import type { ExternalSyncStatus, ExternalSyncType } from "@/lib/types";

const statusLabels: Record<ExternalSyncStatus, string> = {
  started: "시작",
  previewed: "미리보기",
  applied: "반영",
  success: "성공",
  partial_success: "일부 성공",
  failed: "실패"
};

const typeLabels: Record<ExternalSyncType, string> = {
  market_price: "시세",
  fx_rate: "환율",
  csv_import: "CSV",
  broker_connection: "증권사 연결",
  broker_holdings: "증권사 잔고",
  broker_cash: "증권사 현금",
  broker_delete: "연동 데이터 삭제"
};

export function ExternalSyncLogsClient() {
  const { state } = useAppState();
  const [statusFilter, setStatusFilter] = useState<ExternalSyncStatus | "all">(
    "all"
  );
  const logs = useMemo(
    () =>
      state.externalSyncLogs.filter((log) =>
        statusFilter === "all" ? true : log.status === statusFilter
      ),
    [state.externalSyncLogs, statusFilter]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-mint">연동 로그</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">
            외부 데이터 처리 기록
          </h1>
        </div>
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as ExternalSyncStatus | "all")
          }
          className="h-10 rounded-md border border-line bg-white px-3 text-sm"
        >
          <option value="all">전체 상태</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">시작 시각</th>
                <th className="py-3 pr-3">공급자</th>
                <th className="py-3 pr-3">동기화 유형</th>
                <th className="py-3 pr-3">상태</th>
                <th className="py-3 pr-3 text-right">전체</th>
                <th className="py-3 pr-3 text-right">성공</th>
                <th className="py-3 pr-3 text-right">실패</th>
                <th className="py-3 pr-3">오류 내용</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-line/70">
                  <td className="py-3 pr-3">{log.startedAt.slice(0, 16)}</td>
                  <td className="py-3 pr-3">{log.providerName}</td>
                  <td className="py-3 pr-3">{typeLabels[log.syncType]}</td>
                  <td className="py-3 pr-3">{statusLabels[log.status]}</td>
                  <td className="py-3 pr-3 text-right">{log.totalItems}</td>
                  <td className="py-3 pr-3 text-right">{log.successItems}</td>
                  <td className="py-3 pr-3 text-right">{log.failedItems}</td>
                  <td className="py-3 pr-3 text-rose-700">
                    {log.errorMessage ?? "-"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-500">
                    표시할 연동 로그가 없습니다.
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
