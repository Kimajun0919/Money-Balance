"use client";

import Link from "next/link";
import { RefreshCw, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { useAppState } from "@/hooks/use-app-state";
import {
  applyBrokerSyncPreview,
  createBrokerSyncPreview,
  type BrokerSyncPreview
} from "@/lib/services/broker-sync-service";
import { ASSET_TYPE_SETTINGS } from "@/lib/constants/asset-types";
import { formatKrw } from "@/lib/utils/currency";

export function BrokerSyncClient() {
  const { state, updateState } = useAppState();
  const [connectionId, setConnectionId] = useState("");
  const [preview, setPreview] = useState<BrokerSyncPreview | null>(null);
  const [createSnapshot, setCreateSnapshot] = useState(true);
  const [replaceDuplicates, setReplaceDuplicates] = useState(true);
  const [message, setMessage] = useState("");
  const connected = useMemo(
    () =>
      state.externalConnections.filter(
        (connection) =>
          connection.providerType === "broker" &&
          connection.status === "connected"
      ),
    [state.externalConnections]
  );
  const selectedConnectionId = connectionId || connected[0]?.id || "";

  async function sync() {
    if (!selectedConnectionId) return;
    try {
      const result = await createBrokerSyncPreview(state, selectedConnectionId);
      updateState(result.state);
      setPreview(result.preview);
      setMessage("증권사 잔고 동기화 미리보기를 생성했습니다.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "동기화 미리보기에 실패했습니다."
      );
    }
  }

  function apply() {
    if (!preview) return;
    const result = applyBrokerSyncPreview(state, {
      preview,
      createSnapshot,
      replaceDuplicates
    });
    updateState(result.state);
    setMessage(
      `동기화 결과 ${result.createdAssets.length}건을 반영했습니다.${
        result.snapshotId ? " 스냅샷도 생성되었습니다." : ""
      }`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-mint">잔고 동기화</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">
            증권사 잔고 미리보기와 반영
          </h1>
        </div>
        <Link
          href="/connections/broker"
          className="inline-flex h-10 items-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-neutral-700"
        >
          연결 설정
        </Link>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="grid gap-5 md:grid-cols-3">
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-neutral-700">
              연결 계좌
            </span>
            <select
              value={selectedConnectionId}
              onChange={(event) => setConnectionId(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
            >
              {connected.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.brokerName} · {connection.accountAlias}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={sync}
            disabled={!selectedConnectionId}
            className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white disabled:bg-neutral-300"
          >
            <RefreshCw size={17} aria-hidden="true" />
            동기화 실행
          </button>
        </div>
        {connected.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            먼저 읽기 전용 증권사 연결을 생성해야 합니다.
          </p>
        ) : null}
        {message ? <p className="mt-3 text-sm text-neutral-600">{message}</p> : null}
      </section>

      {preview ? (
        <section className="rounded-md border border-line bg-white p-5 shadow-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink">동기화 미리보기</h2>
              <p className="mt-1 text-sm text-neutral-500">
                저장하기 전에 자산군과 평가금액을 확인해 주세요.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-neutral-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={replaceDuplicates}
                  onChange={(event) => setReplaceDuplicates(event.target.checked)}
                />
                중복 자산 교체
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={createSnapshot}
                  onChange={(event) => setCreateSnapshot(event.target.checked)}
                />
                동기화 후 스냅샷 생성
              </label>
            </div>
          </div>

          <div className="table-scroll mt-4 overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-neutral-500">
                  <th className="py-3 pr-3">자산</th>
                  <th className="py-3 pr-3">자산군</th>
                  <th className="py-3 pr-3">종목코드</th>
                  <th className="py-3 pr-3 text-right">수량</th>
                  <th className="py-3 pr-3 text-right">평가금액</th>
                  <th className="py-3 pr-3">중복</th>
                  <th className="py-3 pr-3">확인 메시지</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.externalAssetId} className="border-b border-line/70">
                    <td className="py-3 pr-3 font-medium">
                      {row.assetInput.assetName}
                    </td>
                    <td className="py-3 pr-3">
                      {ASSET_TYPE_SETTINGS[row.assetInput.assetType].label}
                    </td>
                    <td className="py-3 pr-3">
                      {row.assetInput.ticker
                        ? `${row.assetInput.ticker} · ${row.assetInput.market}`
                        : "-"}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      {row.assetInput.quantity?.toLocaleString("ko-KR") ?? "-"}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      {formatKrw(row.asset.valuationAmountKrw)}
                    </td>
                    <td className="py-3 pr-3">
                      {preview.duplicateAssetIds[row.externalAssetId]
                        ? "교체 가능"
                        : "-"}
                    </td>
                    <td className="py-3 pr-3 text-amber-800">
                      {[row.classification.reason, ...row.warnings].join(" / ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={apply}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white"
            >
              <Save size={17} aria-hidden="true" />
              동기화 결과 반영
            </button>
          </div>
        </section>
      ) : null}

      <DisclaimerNote />
    </div>
  );
}
