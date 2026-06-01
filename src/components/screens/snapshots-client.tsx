"use client";

import Link from "next/link";
import { Archive, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { StatusBadge } from "@/components/common/status-badge";
import {
  archiveSnapshot,
  createMonthlySnapshot
} from "@/lib/services/snapshot-service";
import type { StoredSnapshot } from "@/lib/types";
import { useAppState } from "@/hooks/use-app-state";
import { formatKrw } from "@/lib/utils/currency";
import { formatPercent } from "@/lib/utils/percentage";
import { SNAPSHOT_SOURCE_LABELS } from "@/lib/utils/labels";

export function SnapshotsClient() {
  const { state, updateState } = useAppState();
  const [duplicate, setDuplicate] = useState<StoredSnapshot | null>(null);
  const [message, setMessage] = useState<string>("");
  const snapshots = [...state.snapshots].sort(
    (a, b) =>
      new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
  );

  function createSnapshot(policy?: "new" | "replace") {
    try {
      const result = createMonthlySnapshot(state, {
        duplicatePolicy: policy
      });
      if (result.duplicateSnapshot) {
        setDuplicate(result.duplicateSnapshot);
        setMessage(result.message);
        return;
      }
      updateState(result.state);
      setDuplicate(null);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "스냅샷 저장 실패");
    }
  }

  function archive(snapshotId: string) {
    updateState(archiveSnapshot(state, snapshotId));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-mint">월간 스냅샷</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">
            월별 포트폴리오 기준 저장
          </h1>
        </div>
        <button
          type="button"
          onClick={() => createSnapshot()}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white"
        >
          <Plus size={17} aria-hidden="true" />
          새 스냅샷 저장
        </button>
      </div>

      {message ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {message}
        </p>
      ) : null}

      {duplicate ? (
        <section className="rounded-md border border-amber-300 bg-white p-5 shadow-panel">
          <h2 className="text-lg font-bold text-ink">이번 달 스냅샷 확인</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            이번 달 스냅샷이 이미 있습니다. 새 스냅샷으로 저장하면 같은 달 기준이
            추가되고, 교체하면 기존 스냅샷은 보관 상태로 유지됩니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => createSnapshot("new")}
              className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-neutral-700"
            >
              새 스냅샷으로 저장
            </button>
            <button
              type="button"
              onClick={() => createSnapshot("replace")}
              className="inline-flex items-center gap-2 rounded-md bg-mint px-4 py-2 text-sm font-semibold text-white"
            >
              <RefreshCw size={16} aria-hidden="true" />
              이번 달 스냅샷 교체
            </button>
            <button
              type="button"
              onClick={() => setDuplicate(null)}
              className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-neutral-700"
            >
              취소
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">스냅샷 목록</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">저장일</th>
                <th className="py-3 pr-3">원본</th>
                <th className="py-3 pr-3 text-right">총자산</th>
                <th className="py-3 pr-3 text-right">기대수익률</th>
                <th className="py-3 pr-3 text-right">위험점수</th>
                <th className="py-3 pr-3">상태</th>
                <th className="py-3 pr-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((snapshot) => (
                <tr
                  key={snapshot.id}
                  className={`border-b border-line/70 ${
                    snapshot.isArchived ? "bg-neutral-50 text-neutral-500" : ""
                  }`}
                >
                  <td className="py-3 pr-3">{snapshot.snapshotDate}</td>
                  <td className="py-3 pr-3">
                    {SNAPSHOT_SOURCE_LABELS[snapshot.snapshotSource]}
                    {snapshot.isArchived ? " · 보관" : ""}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatKrw(snapshot.totalAssetAmountKrw)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(snapshot.portfolioExpectedReturn)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {snapshot.riskScore.toFixed(1)}점
                  </td>
                  <td className="py-3 pr-3">
                    <StatusBadge status={snapshot.primaryStatus} />
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/snapshots/${snapshot.id}`}
                        className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-neutral-700"
                      >
                        상세 보기
                      </Link>
                      {!snapshot.isArchived ? (
                        <button
                          type="button"
                          onClick={() => archive(snapshot.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-neutral-600"
                          title="보관"
                        >
                          <Archive size={16} aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {snapshots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-500">
                    저장된 월간 스냅샷이 없습니다.
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
