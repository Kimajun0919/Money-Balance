"use client";

import Link from "next/link";
import { useEffect } from "react";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { MetricCard } from "@/components/common/metric-card";
import { ASSET_TYPE_SETTINGS } from "@/lib/constants/asset-types";
import { logKpiEvent } from "@/lib/kpi/event-logger";
import { getReportDetail } from "@/lib/services/report-service";
import { useAppState } from "@/hooks/use-app-state";
import { formatKrw } from "@/lib/utils/currency";
import { formatPercent, formatPoint } from "@/lib/utils/percentage";

export function ReportDetailClient({ reportId }: { reportId: string }) {
  const { state } = useAppState();
  const report = getReportDetail(state, reportId);
  const currentSnapshot = report
    ? state.snapshots.find((snapshot) => snapshot.id === report.currentSnapshotId)
    : undefined;

  useEffect(() => {
    logKpiEvent("monthly_report_viewed", { reportId });
  }, [reportId]);

  if (!report || !currentSnapshot) {
    return (
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h1 className="text-2xl font-bold text-ink">리포트를 찾을 수 없습니다</h1>
        <Link href="/reports" className="mt-4 inline-block text-mint">
          리포트 목록으로 이동
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-mint">리포트 상세</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">
          {report.reportMonth} 월간 리포트
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="총자산"
          value={formatKrw(currentSnapshot.totalAssetAmountKrw)}
          caption={
            report.totalAssetChangeAmount === undefined
              ? "기준 스냅샷 없음"
              : `변화 ${formatKrw(report.totalAssetChangeAmount)}`
          }
        />
        <MetricCard
          title="기대수익률"
          value={formatPercent(currentSnapshot.portfolioExpectedReturn)}
          caption={
            report.expectedReturnChange === undefined
              ? "기준 스냅샷 없음"
              : `변화 ${formatPoint(report.expectedReturnChange)}`
          }
        />
        <MetricCard
          title="목표 괴리"
          value={formatPoint(currentSnapshot.targetGap)}
          caption={
            report.targetGapChange === undefined
              ? "기준 스냅샷 없음"
              : `변화 ${formatPoint(report.targetGapChange)}`
          }
        />
        <MetricCard
          title="월평균 예상 인컴"
          value={formatKrw(currentSnapshot.monthlyIncomeAmount)}
          caption={`연 ${formatKrw(currentSnapshot.portfolioIncomeAmount)}`}
        />
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">요약 해석</h2>
        <div className="mt-3 space-y-2">
          {report.detailJson.messages.map((message) => (
            <p
              key={message}
              className="rounded-md border border-line bg-neutral-50 p-3 text-sm text-neutral-700"
            >
              {message}
            </p>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">자산군 비중 변화</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">자산군</th>
                <th className="py-3 pr-3 text-right">현재비중</th>
                <th className="py-3 pr-3 text-right">이전비중</th>
                <th className="py-3 pr-3 text-right">변화</th>
              </tr>
            </thead>
            <tbody>
              {report.detailJson.allocationChanges.map((change) => (
                <tr key={change.assetType} className="border-b border-line/70">
                  <td className="py-3 pr-3 font-medium">
                    {ASSET_TYPE_SETTINGS[change.assetType].label}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(change.currentRatio)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {change.previousRatio === undefined
                      ? "기준 없음"
                      : formatPercent(change.previousRatio)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {change.change === undefined
                      ? "기준 없음"
                      : formatPoint(change.change)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">관련 이력</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-line p-4">
            <p className="font-semibold">리밸런싱 이력</p>
            <p className="mt-2 text-sm text-neutral-600">
              {report.detailJson.rebalancingSuggestionIds.length}건
            </p>
          </div>
          <div className="rounded-md border border-line p-4">
            <p className="font-semibold">월 신규 투자금 계획</p>
            <p className="mt-2 text-sm text-neutral-600">
              {report.detailJson.monthlyAllocationPlanIds.length}건
            </p>
          </div>
        </div>
      </section>

      <DisclaimerNote />
    </div>
  );
}
