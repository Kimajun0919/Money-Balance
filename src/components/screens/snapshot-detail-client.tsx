"use client";

import Link from "next/link";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ASSET_TYPE_SETTINGS } from "@/lib/constants/asset-types";
import { useAppState } from "@/hooks/use-app-state";
import { getSnapshotDetail } from "@/lib/services/snapshot-service";
import { formatKrw } from "@/lib/utils/currency";
import { formatPercent } from "@/lib/utils/percentage";
import { SNAPSHOT_SOURCE_LABELS } from "@/lib/utils/labels";

export function SnapshotDetailClient({ snapshotId }: { snapshotId: string }) {
  const { state } = useAppState();
  const snapshot = getSnapshotDetail(state, snapshotId);
  const report = state.monthlyReports.find(
    (item) => item.currentSnapshotId === snapshotId
  );

  if (!snapshot) {
    return (
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h1 className="text-2xl font-bold text-ink">스냅샷을 찾을 수 없습니다</h1>
        <Link href="/snapshots" className="mt-4 inline-block text-mint">
          스냅샷 목록으로 이동
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-mint">스냅샷 상세</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">
            {snapshot.snapshotDate} 기준
          </h1>
        </div>
        {report ? (
          <Link
            href={`/reports/${report.id}`}
            className="rounded-md bg-mint px-4 py-2 text-sm font-semibold text-white"
          >
            리포트 보기
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="총자산" value={formatKrw(snapshot.totalAssetAmountKrw)} />
        <MetricCard
          title="기준 기대수익률"
          value={formatPercent(snapshot.referencePortfolioExpectedReturn)}
          caption={`현재 포트폴리오 ${formatPercent(snapshot.portfolioExpectedReturn)}`}
        />
        <MetricCard
          title="위험점수"
          value={`${snapshot.riskScore.toFixed(1)}점`}
          caption={`상한 ${snapshot.riskScoreLimit}점`}
        />
        <MetricCard
          title="스냅샷 원본"
          value={SNAPSHOT_SOURCE_LABELS[snapshot.snapshotSource]}
          caption={snapshot.isArchived ? "보관된 스냅샷" : "활성 스냅샷"}
        />
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">상태</h2>
          <StatusBadge status={snapshot.primaryStatus} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {snapshot.activeFlags.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">자산군별 스냅샷 항목</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">자산군</th>
                <th className="py-3 pr-3 text-right">현재금액</th>
                <th className="py-3 pr-3 text-right">현재비중</th>
                <th className="py-3 pr-3 text-right">목표비중</th>
                <th className="py-3 pr-3 text-right">조정 참고 금액</th>
                <th className="py-3 pr-3">비중 상태</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.items.map((item) => (
                <tr key={item.assetType} className="border-b border-line/70">
                  <td className="py-3 pr-3 font-medium">
                    {ASSET_TYPE_SETTINGS[item.assetType].label}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatKrw(item.currentAmount)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(item.currentRatio)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(item.targetRatio)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatKrw(item.adjustmentAmount)}
                  </td>
                  <td className="py-3 pr-3">
                    {item.allocationGapStatus === "within"
                      ? "허용 범위"
                      : item.allocationGapStatus === "below"
                        ? "목표 하회"
                        : "목표 초과"}
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
