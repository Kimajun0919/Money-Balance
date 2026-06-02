"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAppState } from "@/hooks/use-app-state";
import { listConnectionCenterItems } from "@/lib/services/institution-connection-service";

export function ConnectionDetailClient({ connectionId }: { connectionId: string }) {
  const { state } = useAppState();
  const item = useMemo(
    () => listConnectionCenterItems(state).find((entry) => entry.id === connectionId),
    [connectionId, state]
  );
  const jobs = state.accountSyncJobs.filter(
    (job) => job.externalConnectionId === connectionId
  );
  const connection = state.externalConnections.find(
    (entry) => entry.id === connectionId
  );

  if (!item) {
    return (
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h1 className="text-2xl font-bold text-ink">연결을 찾을 수 없습니다</h1>
        <Link href="/connections" className="mt-4 inline-block text-mint">
          연결 센터로 이동
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-mint">연결 상세</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">{item.providerName}</h1>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-sm text-neutral-500">공급자 ID</p>
            <p className="mt-1 font-semibold text-ink">{item.providerId}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">유형</p>
            <p className="mt-1 font-semibold text-ink">{item.providerType}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">권한</p>
            <p className="mt-1 font-semibold text-ink">{item.permissionState}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">상태</p>
            <p className="mt-1 font-semibold text-ink">{item.status}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">마지막 성공</p>
            <p className="mt-1 font-semibold text-ink">
              {item.lastSuccessfulSync?.slice(0, 16) ?? "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">마지막 실패</p>
            <p className="mt-1 font-semibold text-ink">
              {item.lastFailedSync?.slice(0, 16) ?? "-"}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-neutral-500">오류 메시지</p>
            <p className="mt-1 font-semibold text-ink">
              {item.failureReason ?? connection?.lastError ?? "-"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">동기화 작업</h2>
        <div className="mt-4 space-y-2 text-sm">
          {jobs.map((job) => (
            <p key={job.id} className="rounded-md border border-line p-3">
              {job.startedAt.slice(0, 16)} · {job.syncType} · {job.status} · 계좌{" "}
              {job.accountCount}개 · 자산 {job.assetCount}개
            </p>
          ))}
          {jobs.length === 0 ? (
            <p className="text-neutral-500">동기화 작업 기록이 없습니다.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
