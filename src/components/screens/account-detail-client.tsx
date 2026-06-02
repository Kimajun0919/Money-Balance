"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAppState } from "@/hooks/use-app-state";

function formatWon(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(value);
}

export function AccountDetailClient({ accountId }: { accountId: string }) {
  const { state } = useAppState();
  const account = state.financialAccounts.find((item) => item.id === accountId);
  const institution = account
    ? state.financialInstitutions.find(
        (item) => item.id === account.institutionId
      )
    : undefined;
  const linkedAssets = useMemo(() => {
    const links = state.financialAccountAssetLinks.filter(
      (link) => link.financialAccountId === accountId
    );
    return links
      .map((link) => state.assets.find((asset) => asset.id === link.assetId))
      .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));
  }, [accountId, state.assets, state.financialAccountAssetLinks]);
  const syncItems = state.accountSyncItems.filter(
    (item) =>
      item.createdAccountId === accountId || item.updatedAccountId === accountId
  );

  if (!account) {
    return (
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h1 className="text-2xl font-bold text-ink">계좌를 찾을 수 없습니다</h1>
        <Link href="/accounts" className="mt-4 inline-block text-mint">
          계좌 목록으로 이동
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-mint">계좌 상세</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">
          {account.accountAlias}
        </h1>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-sm text-neutral-500">기관</p>
            <p className="mt-1 font-semibold text-ink">
              {institution?.displayName ?? "수동"}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">계좌 유형</p>
            <p className="mt-1 font-semibold text-ink">{account.accountType}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">통화</p>
            <p className="mt-1 font-semibold text-ink">{account.currency}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">평가 출처</p>
            <p className="mt-1 font-semibold text-ink">
              {account.valuationSource}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">잔고</p>
            <p className="mt-1 font-semibold text-ink">
              {account.balance.toLocaleString("ko-KR")}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">원화 평가</p>
            <p className="mt-1 font-semibold text-ink">
              {formatWon(
                account.isLiability
                  ? account.liabilityAmountKrw ?? 0
                  : account.valuationAmountKrw
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">마지막 동기화</p>
            <p className="mt-1 font-semibold text-ink">
              {account.lastSyncedAt?.slice(0, 16) ?? "없음"}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">동기화 상태</p>
            <p className="mt-1 font-semibold text-ink">
              {account.syncStatus} · {account.staleStatus}
            </p>
          </div>
        </div>
      </section>

      {account.warningCodes.length > 0 ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <h2 className="font-bold">주의 사항</h2>
          <p className="mt-2">{account.warningCodes.join(", ")}</p>
        </section>
      ) : null}

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">연결된 자산</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">자산</th>
                <th className="py-3 pr-3">자산군</th>
                <th className="py-3 pr-3">종목</th>
                <th className="py-3 pr-3 text-right">원화 평가</th>
              </tr>
            </thead>
            <tbody>
              {linkedAssets.map((asset) => (
                <tr key={asset.id} className="border-b border-line/70">
                  <td className="py-3 pr-3 font-medium">{asset.assetName}</td>
                  <td className="py-3 pr-3">{asset.assetType}</td>
                  <td className="py-3 pr-3">
                    {asset.ticker ? `${asset.ticker} · ${asset.market}` : "-"}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatWon(asset.valuationAmountKrw)}
                  </td>
                </tr>
              ))}
              {linkedAssets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-neutral-500">
                    연결된 자산이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">동기화 이력</h2>
        <div className="mt-4 space-y-2 text-sm">
          {syncItems.map((item) => (
            <p key={item.id} className="rounded-md border border-line p-3">
              {item.createdAt.slice(0, 16)} · {item.action} · {item.status}
            </p>
          ))}
          {syncItems.length === 0 ? (
            <p className="text-neutral-500">동기화 이력이 없습니다.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
