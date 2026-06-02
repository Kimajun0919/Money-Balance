"use client";

import Link from "next/link";
import { Plug, Trash2, Unplug } from "lucide-react";
import { useState } from "react";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { useAppState } from "@/hooks/use-app-state";
import {
  connectBroker,
  connectServerManagedBroker,
  deleteSyncedBrokerData,
  disconnectBroker
} from "@/lib/services/broker-connection-service";
import type { BrokerConnectionResult } from "@/lib/providers/broker/broker-provider";
import { KIS_BROKER_PROVIDER_NAME } from "@/lib/providers/broker/broker-provider-constants";
import {
  EXTERNAL_CONNECTION_STATUS_LABELS,
  EXTERNAL_SCOPE_LABELS
} from "@/lib/utils/labels";

type BrokerProviderOption = "mock" | "kis";

async function readApiJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? "API 요청에 실패했습니다.");
  }
  return payload as T;
}

export function BrokerConnectionClient() {
  const { state, updateState } = useAppState();
  const [provider, setProvider] = useState<BrokerProviderOption>("mock");
  const [accessToken, setAccessToken] = useState("mock-readonly-token");
  const [accountAlias, setAccountAlias] = useState("모의 종합계좌");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const brokerConnections = state.externalConnections.filter(
    (connection) => connection.providerType === "broker"
  );

  async function connect() {
    setBusy(true);
    try {
      const result =
        provider === "kis"
          ? connectServerManagedBroker(state, {
              accountAlias,
              consentAccepted,
              connectionResult: (
                await readApiJson<{
                  connectionResult: BrokerConnectionResult;
                }>(
                  await fetch("/api/broker/kis/connect", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ accountAlias, consentAccepted })
                  })
                )
              ).connectionResult
            })
          : await connectBroker(state, {
              accessToken,
              accountAlias,
              consentAccepted
            });
      updateState(result.state);
      if (provider === "mock") setAccessToken("");
      setMessage(
        provider === "kis"
          ? "한국투자증권 읽기 전용 연결이 저장되었습니다."
          : "읽기 전용 모의 증권사 연결이 저장되었습니다."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "연결에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function disconnect(connectionId: string) {
    updateState(disconnectBroker(state, connectionId));
  }

  function deleteData(connectionId: string) {
    updateState(deleteSyncedBrokerData(state, connectionId));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-mint">증권사 연결</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">
            읽기 전용 잔고 연동
          </h1>
        </div>
        <Link
          href="/connections/broker/sync"
          className="inline-flex h-10 items-center rounded-md bg-mint px-4 text-sm font-semibold text-white"
        >
          잔고 동기화
        </Link>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">연동 동의</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Yield Balance는 증권사 계좌의 잔고 정보를 읽기 전용으로 가져옵니다.
          주문, 매수, 매도 API는 이 화면에서 호출하지 않습니다. 한국투자증권
          연동은 서버의 .env.local에 저장된 AppKey/AppSecret만 사용합니다.
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">
              연동 공급자
            </span>
            <select
              value={provider}
              onChange={(event) => {
                const nextProvider = event.target.value as BrokerProviderOption;
                setProvider(nextProvider);
                setAccountAlias(
                  nextProvider === "kis" ? "한국투자 종합계좌" : "모의 종합계좌"
                );
              }}
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
            >
              <option value="mock">모의 증권사</option>
              <option value="kis">한국투자증권 KIS</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">
              계좌 별칭
            </span>
            <input
              value={accountAlias}
              onChange={(event) => setAccountAlias(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
            />
          </label>
          {provider === "mock" ? (
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-neutral-700">
                모의 읽기 전용 토큰
              </span>
              <input
                value={accessToken}
                onChange={(event) => setAccessToken(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-line px-3"
                type="password"
              />
            </label>
          ) : (
            <div className="rounded-md border border-line bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-600 md:col-span-2">
              한국투자증권 연결은 브라우저에 키를 입력하지 않습니다.
              `KIS_APP_KEY`, `KIS_APP_SECRET`, `KIS_ACCOUNT_NUMBER`를 서버
              환경변수에 설정한 뒤 연결합니다.
            </div>
          )}
        </div>
        <label className="mt-5 flex items-start gap-3 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={consentAccepted}
            onChange={(event) => setConsentAccepted(event.target.checked)}
            className="mt-1"
          />
          <span>
            잔고와 현금 정보를 읽기 전용으로 가져오며, 주문 관련 권한을 저장하거나
            호출하지 않는다는 점을 확인했습니다.
          </span>
        </label>
        {provider === "kis" ? (
          <p className="mt-3 text-sm text-amber-800">
            현재 구현은 잔고/예수금 조회 전용입니다. 주문 API와 자동 실거래
            실행은 연결하지 않았습니다.
          </p>
        ) : null}
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={connect}
            disabled={busy || !consentAccepted}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white disabled:bg-neutral-300"
          >
            <Plug size={17} aria-hidden="true" />
            {provider === "kis" ? "한국투자증권 연결" : "모의 증권사 연결"}
          </button>
          {message ? <p className="text-sm text-neutral-600">{message}</p> : null}
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">연결 상태</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">증권사</th>
                <th className="py-3 pr-3">계좌</th>
                <th className="py-3 pr-3">권한</th>
                <th className="py-3 pr-3">상태</th>
                <th className="py-3 pr-3">마지막 동기화</th>
                <th className="py-3 pr-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {brokerConnections.map((connection) => (
                <tr key={connection.id} className="border-b border-line/70">
                  <td className="py-3 pr-3 font-medium">
                    {connection.brokerName}
                    {connection.providerName === KIS_BROKER_PROVIDER_NAME ? (
                      <span className="ml-2 rounded-md bg-teal-50 px-2 py-1 text-xs text-mint">
                        실 API
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-3">
                    {connection.accountAlias} ·{" "}
                    {connection.accountIdentifierMasked}
                  </td>
                  <td className="py-3 pr-3">
                    {connection.scopes
                      .map((scope) => EXTERNAL_SCOPE_LABELS[scope] ?? scope)
                      .join(", ")}
                  </td>
                  <td className="py-3 pr-3">
                    {EXTERNAL_CONNECTION_STATUS_LABELS[connection.status]}
                  </td>
                  <td className="py-3 pr-3">
                    {connection.lastSyncedAt?.slice(0, 16) ?? "-"}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => disconnect(connection.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-neutral-600"
                        title="연동 해제"
                      >
                        <Unplug size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteData(connection.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-rose-700"
                        title="동기화 데이터 삭제"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {brokerConnections.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500">
                    연결된 증권사가 없습니다.
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
