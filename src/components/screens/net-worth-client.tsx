"use client";

import { Save } from "lucide-react";
import { useMemo, useState } from "react";
import { MetricCard } from "@/components/common/metric-card";
import { useAppState } from "@/hooks/use-app-state";
import {
  calculateNetWorth,
  createNetWorthSnapshot
} from "@/lib/services/net-worth-service";
import { getAccountFreshnessWarnings } from "@/lib/services/account-freshness-service";

function formatWon(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(value);
}

export function NetWorthClient() {
  const { state, updateState } = useAppState();
  const [message, setMessage] = useState("");
  const summary = useMemo(() => calculateNetWorth(state), [state]);
  const warnings = useMemo(() => getAccountFreshnessWarnings(state), [state]);

  function saveSnapshot() {
    const result = createNetWorthSnapshot(state);
    updateState(result.state);
    setMessage(`${result.snapshot.referenceMonth} 순자산 스냅샷을 저장했습니다.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-mint">순자산</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">월별 순자산 기록</h1>
        </div>
        <button
          type="button"
          onClick={saveSnapshot}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white"
        >
          <Save size={17} aria-hidden="true" />
          이번 달 저장
        </button>
      </div>

      {message ? (
        <p className="rounded-md border border-line bg-white px-4 py-3 text-sm text-neutral-700">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="총자산"
          value={formatWon(summary.totalAssetsKrw)}
          caption={`계좌 ${summary.accountCount}개`}
        />
        <MetricCard
          title="총부채"
          value={formatWon(summary.totalLiabilitiesKrw)}
          tone={summary.totalLiabilitiesKrw > 0 ? "saffron" : "neutral"}
        />
        <MetricCard
          title="순자산"
          value={formatWon(summary.netWorthKrw)}
          tone="mint"
        />
        <MetricCard
          title="데이터 경고"
          value={`${warnings.length}건`}
          caption="24시간 기준"
          tone={warnings.length > 0 ? "saffron" : "neutral"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-md border border-line bg-white p-5 shadow-panel">
          <h2 className="text-lg font-bold text-ink">통화 노출</h2>
          <div className="mt-4 space-y-2 text-sm">
            {Object.entries(summary.currencyExposure).map(([currency, value]) => (
              <div key={currency} className="flex items-center justify-between">
                <span className="text-neutral-600">{currency}</span>
                <span className="font-semibold text-ink">{formatWon(value)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-line bg-white p-5 shadow-panel">
          <h2 className="text-lg font-bold text-ink">평가 출처</h2>
          <div className="mt-4 space-y-2 text-sm">
            {Object.entries(summary.valuationSourceBreakdown).map(([source, value]) => (
              <div key={source} className="flex items-center justify-between">
                <span className="text-neutral-600">{source}</span>
                <span className="font-semibold text-ink">{formatWon(value)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">스냅샷</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">기준월</th>
                <th className="py-3 pr-3 text-right">총자산</th>
                <th className="py-3 pr-3 text-right">총부채</th>
                <th className="py-3 pr-3 text-right">순자산</th>
                <th className="py-3 pr-3 text-right">경고</th>
              </tr>
            </thead>
            <tbody>
              {state.netWorthSnapshots.map((snapshot) => (
                <tr key={snapshot.id} className="border-b border-line/70">
                  <td className="py-3 pr-3">{snapshot.referenceMonth}</td>
                  <td className="py-3 pr-3 text-right">
                    {formatWon(snapshot.totalAssetsKrw)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatWon(snapshot.totalLiabilitiesKrw)}
                  </td>
                  <td className="py-3 pr-3 text-right font-semibold">
                    {formatWon(snapshot.netWorthKrw)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {snapshot.staleWarningCount}
                  </td>
                </tr>
              ))}
              {state.netWorthSnapshots.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500">
                    저장된 순자산 스냅샷이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
