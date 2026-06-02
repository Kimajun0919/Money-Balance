"use client";

import Link from "next/link";
import { Database, Plug, RefreshCw, Trash2, Unplug } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppState } from "@/hooks/use-app-state";
import {
  connectMockProvider,
  createDisabledMyDataConnectionPlaceholder,
  createDisabledOpenBankingConnectionPlaceholder,
  deleteInstitutionSyncedData,
  disconnectInstitutionConnection,
  listConnectionCenterItems
} from "@/lib/services/institution-connection-service";
import { MockBankProvider } from "@/lib/services/providers/banking/mock-bank-provider";
import { MockSecuritiesProvider } from "@/lib/services/providers/broker/mock-securities-provider";

const statusLabels: Record<string, string> = {
  connected: "연결됨",
  disconnected: "연결 안 됨",
  failed: "오류",
  deleted: "삭제됨",
  disabled: "비활성"
};

export function ConnectionsClient() {
  const { state, updateState } = useAppState();
  const [message, setMessage] = useState("");
  const items = useMemo(() => listConnectionCenterItems(state), [state]);

  function connectMock(kind: "bank" | "securities") {
    const provider =
      kind === "bank" ? new MockBankProvider() : new MockSecuritiesProvider();
    const result = connectMockProvider(state, provider);
    updateState(result.state);
    setMessage(`${provider.providerName} 연결을 생성했습니다.`);
  }

  function addDisabledPlaceholders() {
    let nextState = createDisabledOpenBankingConnectionPlaceholder(state);
    nextState = createDisabledMyDataConnectionPlaceholder(nextState);
    updateState(nextState);
    setMessage("비활성 공식 어댑터 표시를 추가했습니다.");
  }

  function disconnect(connectionId: string) {
    updateState(disconnectInstitutionConnection(state, connectionId));
    setMessage("연결을 해제했습니다.");
  }

  function deleteData(connectionId: string) {
    updateState(deleteInstitutionSyncedData(state, connectionId));
    setMessage("동기화 데이터를 삭제했습니다.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-mint">연결 센터</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">외부 연결 관리</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/connections/sync"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white"
          >
            <RefreshCw size={17} aria-hidden="true" />
            계좌 동기화
          </Link>
          <button
            type="button"
            onClick={addDisabledPlaceholders}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-neutral-700"
          >
            <Database size={17} aria-hidden="true" />
            비활성 어댑터 표시
          </button>
        </div>
      </div>

      {message ? (
        <p className="rounded-md border border-line bg-white px-4 py-3 text-sm text-neutral-700">
          {message}
        </p>
      ) : null}

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">빠른 연결</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => connectMock("bank")}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white"
          >
            <Plug size={17} aria-hidden="true" />
            모의 은행 연결
          </button>
          <button
            type="button"
            onClick={() => connectMock("securities")}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white"
          >
            <Plug size={17} aria-hidden="true" />
            모의 증권 연결
          </button>
          <Link
            href="/connections/broker"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-neutral-700"
          >
            KIS 증권 연결
          </Link>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">연결 목록</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">공급자</th>
                <th className="py-3 pr-3">구분</th>
                <th className="py-3 pr-3">권한</th>
                <th className="py-3 pr-3">상태</th>
                <th className="py-3 pr-3">마지막 성공</th>
                <th className="py-3 pr-3">실패 사유</th>
                <th className="py-3 pr-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const realConnection = state.externalConnections.find(
                  (connection) => connection.id === item.id
                );
                return (
                  <tr key={item.id} className="border-b border-line/70">
                    <td className="py-3 pr-3 font-medium">
                      <Link href={`/connections/${item.id}`} className="text-mint">
                        {item.providerName}
                      </Link>
                    </td>
                    <td className="py-3 pr-3">{item.category}</td>
                    <td className="py-3 pr-3">{item.permissionState}</td>
                    <td className="py-3 pr-3">
                      {statusLabels[item.status] ?? item.status}
                    </td>
                    <td className="py-3 pr-3">
                      {item.lastSuccessfulSync?.slice(0, 16) ?? "-"}
                    </td>
                    <td className="py-3 pr-3 text-amber-800">
                      {item.failureReason ?? "-"}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      {realConnection ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => disconnect(realConnection.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-neutral-600"
                            title="연결 해제"
                          >
                            <Unplug size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteData(realConnection.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-rose-700"
                            title="동기화 데이터 삭제"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
