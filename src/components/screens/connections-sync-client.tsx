"use client";

import { useState } from "react";
import { Play, Save } from "lucide-react";
import { useAppState } from "@/hooks/use-app-state";
import {
  applyAccountSyncPreview,
  previewAccountSync,
  recordAccountSyncPreview,
  type AccountSyncPreview
} from "@/lib/services/account-sync-service";
import { connectMockProvider } from "@/lib/services/institution-connection-service";
import { MockBankProvider } from "@/lib/services/providers/banking/mock-bank-provider";
import { MockSecuritiesProvider } from "@/lib/services/providers/broker/mock-securities-provider";

type SyncProviderId = "mock-bank" | "mock-securities";

function providerFor(id: SyncProviderId) {
  return id === "mock-bank" ? new MockBankProvider() : new MockSecuritiesProvider();
}

function formatWon(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(value);
}

export function ConnectionsSyncClient() {
  const { state, updateState } = useAppState();
  const [providerId, setProviderId] = useState<SyncProviderId>("mock-bank");
  const [preview, setPreview] = useState<AccountSyncPreview | null>(null);
  const [replaceDuplicates, setReplaceDuplicates] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function createPreview() {
    setBusy(true);
    try {
      const provider = providerFor(providerId);
      const connected = connectMockProvider(state, provider);
      const result = await previewAccountSync(connected.state, provider, {
        externalConnectionId: connected.connection.id
      });
      const loggedState = recordAccountSyncPreview(connected.state, result.preview);
      updateState(loggedState);
      setPreview(result.preview);
      setMessage("동기화 미리보기를 생성했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "동기화 미리보기에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function applyPreview() {
    if (!preview) return;
    const result = applyAccountSyncPreview(state, {
      preview,
      replaceDuplicates
    });
    updateState(result.state);
    setMessage(
      `동기화 반영 완료: 작업 ${result.job.id}, 항목 ${result.items.length}개`
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-mint">계좌 동기화</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">
          미리보기 후 반영
        </h1>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-neutral-700">공급자</span>
            <select
              value={providerId}
              onChange={(event) => setProviderId(event.target.value as SyncProviderId)}
              className="mt-2 h-10 w-full rounded-md border border-line px-3 text-sm"
            >
              <option value="mock-bank">모의 은행</option>
              <option value="mock-securities">모의 증권</option>
            </select>
          </label>
          <label className="mt-8 flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={replaceDuplicates}
              onChange={(event) => setReplaceDuplicates(event.target.checked)}
            />
            중복 항목 교체
          </label>
          <button
            type="button"
            onClick={createPreview}
            disabled={busy}
            className="mt-7 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white disabled:bg-neutral-300"
          >
            <Play size={17} aria-hidden="true" />
            미리보기
          </button>
        </div>
        {message ? <p className="mt-3 text-sm text-neutral-600">{message}</p> : null}
      </section>

      {preview ? (
        <section className="rounded-md border border-line bg-white p-5 shadow-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink">미리보기 결과</h2>
              <p className="mt-1 text-sm text-neutral-500">
                계좌 {preview.normalized.accounts.length}개 · 보유자산{" "}
                {preview.normalized.assets.length}개 · 중복{" "}
                {Object.keys(preview.duplicateAccountIds).length +
                  Object.keys(preview.duplicateAssetIds).length}
                개
              </p>
            </div>
            <button
              type="button"
              onClick={applyPreview}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white"
            >
              <Save size={17} aria-hidden="true" />
              반영
            </button>
          </div>

          <div className="table-scroll mt-4 overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-neutral-500">
                  <th className="py-3 pr-3">구분</th>
                  <th className="py-3 pr-3">이름</th>
                  <th className="py-3 pr-3">유형</th>
                  <th className="py-3 pr-3">통화</th>
                  <th className="py-3 pr-3 text-right">원화 평가</th>
                  <th className="py-3 pr-3">중복</th>
                </tr>
              </thead>
              <tbody>
                {preview.normalized.accounts.map((account) => (
                  <tr key={account.id} className="border-b border-line/70">
                    <td className="py-3 pr-3">계좌</td>
                    <td className="py-3 pr-3 font-medium">{account.accountAlias}</td>
                    <td className="py-3 pr-3">{account.accountType}</td>
                    <td className="py-3 pr-3">{account.currency}</td>
                    <td className="py-3 pr-3 text-right">
                      {formatWon(
                        account.isLiability
                          ? account.liabilityAmountKrw ?? 0
                          : account.valuationAmountKrw
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      {preview.duplicateAccountIds[account.id] ? "있음" : "-"}
                    </td>
                  </tr>
                ))}
                {preview.normalized.assets.map((asset) => (
                  <tr key={asset.id} className="border-b border-line/70">
                    <td className="py-3 pr-3">보유자산</td>
                    <td className="py-3 pr-3 font-medium">{asset.assetName}</td>
                    <td className="py-3 pr-3">{asset.assetType}</td>
                    <td className="py-3 pr-3">{asset.currency}</td>
                    <td className="py-3 pr-3 text-right">
                      {formatWon(asset.valuationAmountKrw)}
                    </td>
                    <td className="py-3 pr-3">
                      {preview.duplicateAssetIds[asset.id] ? "있음" : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
