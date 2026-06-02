"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, Plus, RefreshCw, Settings, WalletCards } from "lucide-react";
import { useAppState } from "@/hooks/use-app-state";
import { MetricCard } from "@/components/common/metric-card";
import { buildAccountAggregationDashboard } from "@/lib/services/account-aggregation-service";
import {
  applyAccountSyncPreview,
  previewAccountSync,
  recordAccountSyncPreview
} from "@/lib/services/account-sync-service";
import { connectMockProvider } from "@/lib/services/institution-connection-service";
import { createManualAccount } from "@/lib/services/manual-account-service";
import { MockBankProvider } from "@/lib/services/providers/banking/mock-bank-provider";
import { MockSecuritiesProvider } from "@/lib/services/providers/broker/mock-securities-provider";
import type { FinancialAccountType } from "@/lib/types";

const accountTypeLabels: Record<FinancialAccountType, string> = {
  bank_checking: "입출금",
  bank_savings: "예금",
  installment_savings: "적금",
  cash: "현금",
  securities_cash: "증권 예수금",
  securities: "증권계좌",
  domestic_stock: "국내주식",
  overseas_stock: "해외주식",
  etf: "ETF",
  bond: "채권",
  pension: "연금",
  loan: "대출",
  other_asset: "기타 자산",
  other_liability: "기타 부채"
};

const manualAccountTypes: FinancialAccountType[] = [
  "bank_checking",
  "bank_savings",
  "installment_savings",
  "cash",
  "securities_cash",
  "domestic_stock",
  "overseas_stock",
  "etf",
  "bond",
  "pension",
  "loan",
  "other_asset",
  "other_liability"
];

function formatWon(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(value);
}

function parseNumber(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "0").replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function AccountsClient() {
  const { state, updateState } = useAppState();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const data = useMemo(() => buildAccountAggregationDashboard(state), [state]);

  async function refreshMockAccounts() {
    setBusy(true);
    try {
      let nextState = state;
      for (const provider of [new MockBankProvider(), new MockSecuritiesProvider()]) {
        const connected = connectMockProvider(nextState, provider);
        nextState = connected.state;
        const previewResult = await previewAccountSync(nextState, provider, {
          externalConnectionId: connected.connection.id
        });
        nextState = recordAccountSyncPreview(nextState, previewResult.preview);
        const applied = applyAccountSyncPreview(nextState, {
          preview: previewResult.preview,
          replaceDuplicates: true
        });
        nextState = applied.state;
      }
      updateState(nextState);
      setMessage("모의 은행과 모의 증권 계좌를 새로 동기화했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "계좌 동기화에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function addManualAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const accountType = String(form.get("accountType")) as FinancialAccountType;
    const balance = parseNumber(form.get("balance"));
    const result = createManualAccount(state, {
      accountAlias: String(form.get("accountAlias") || "수동 계좌"),
      accountType,
      currency: String(form.get("currency") || "KRW").toUpperCase(),
      balance,
      valuationAmountKrw:
        accountType === "loan" || accountType === "other_liability"
          ? 0
          : Math.abs(parseNumber(form.get("valuationAmountKrw")) || balance),
      liabilityAmountKrw:
        accountType === "loan" || accountType === "other_liability"
          ? Math.abs(parseNumber(form.get("valuationAmountKrw")) || balance)
          : undefined
    });
    updateState(result.state);
    setMessage("수동 계좌를 추가했습니다.");
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-mint">계좌 통합 조회</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">전체 금융 현황</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshMockAccounts}
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white disabled:bg-neutral-300"
          >
            <RefreshCw size={17} aria-hidden="true" />
            수동 새로고침
          </button>
          <Link
            href="/connections"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-neutral-700"
          >
            <Settings size={17} aria-hidden="true" />
            연결 설정
          </Link>
        </div>
      </div>

      {message ? (
        <p className="rounded-md border border-line bg-white px-4 py-3 text-sm text-neutral-700">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="순자산"
          value={formatWon(data.totalNetWorthKrw)}
          caption={`총자산 ${formatWon(data.grossAssetsKrw)}`}
          icon={<WalletCards size={20} aria-hidden="true" />}
        />
        <MetricCard
          title="현금성 자산"
          value={formatWon(data.cashTotalKrw)}
          caption={`예금/적금 ${formatWon(data.netWorth.depositAssetsKrw)}`}
        />
        <MetricCard
          title="투자자산"
          value={formatWon(data.investmentTotalKrw)}
          caption={`증권 계좌 ${formatWon(data.securitiesTotalKrw)}`}
        />
        <MetricCard
          title="부채"
          value={formatWon(data.totalLiabilitiesKrw)}
          caption={`계좌 ${data.netWorth.accountCount}개, 기관 ${data.netWorth.institutionCount}개`}
          tone={data.totalLiabilitiesKrw > 0 ? "saffron" : "neutral"}
        />
      </div>

      {data.staleDataWarnings.length > 0 || data.connectionWarnings.length > 0 ? (
        <section className="space-y-2">
          {[...data.connectionWarnings, ...data.staleDataWarnings].slice(0, 5).map((warning) => (
            <p
              key={warning.id}
              className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            >
              <AlertTriangle size={16} aria-hidden="true" className="mt-0.5" />
              <span>{warning.message}</span>
            </p>
          ))}
        </section>
      ) : null}

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">수동 계좌 추가</h2>
        <form onSubmit={addManualAccount} className="mt-4 grid gap-3 md:grid-cols-5">
          <input
            name="accountAlias"
            placeholder="계좌 별칭"
            required
            className="h-10 rounded-md border border-line px-3 text-sm"
          />
          <select
            name="accountType"
            className="h-10 rounded-md border border-line px-3 text-sm"
            defaultValue="bank_checking"
          >
            {manualAccountTypes.map((type) => (
              <option key={type} value={type}>
                {accountTypeLabels[type]}
              </option>
            ))}
          </select>
          <input
            name="currency"
            defaultValue="KRW"
            className="h-10 rounded-md border border-line px-3 text-sm"
          />
          <input
            name="balance"
            inputMode="numeric"
            placeholder="잔고"
            required
            className="h-10 rounded-md border border-line px-3 text-sm"
          />
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white"
          >
            <Plus size={17} aria-hidden="true" />
            추가
          </button>
        </form>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-md border border-line bg-white p-5 shadow-panel">
          <h2 className="text-lg font-bold text-ink">기관별 현황</h2>
          <div className="mt-4 space-y-3">
            {data.institutionSummary.map((item) => (
              <div
                key={item.institution.id}
                className="rounded-md border border-line bg-neutral-50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">
                      {item.institution.displayName}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {item.accountCount}개 계좌 · {item.status}
                    </p>
                  </div>
                  <p className="text-right font-bold text-ink">
                    {formatWon(item.netValueKrw)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-line bg-white p-5 shadow-panel">
          <h2 className="text-lg font-bold text-ink">자산군 노출</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(data.assetClassSummary).map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">{label}</span>
                <span className="font-semibold text-ink">{formatWon(value)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">계좌 목록</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">계좌</th>
                <th className="py-3 pr-3">기관</th>
                <th className="py-3 pr-3">유형</th>
                <th className="py-3 pr-3">통화</th>
                <th className="py-3 pr-3 text-right">잔고</th>
                <th className="py-3 pr-3 text-right">원화 평가</th>
                <th className="py-3 pr-3">상태</th>
              </tr>
            </thead>
            <tbody>
              {data.accountSummary.map((item) => (
                <tr key={item.account.id} className="border-b border-line/70">
                  <td className="py-3 pr-3 font-medium">
                    <Link href={`/accounts/${item.account.id}`} className="text-mint">
                      {item.account.accountAlias}
                    </Link>
                  </td>
                  <td className="py-3 pr-3">
                    {item.institution?.displayName ?? "수동"}
                  </td>
                  <td className="py-3 pr-3">
                    {accountTypeLabels[item.account.accountType]}
                  </td>
                  <td className="py-3 pr-3">{item.account.currency}</td>
                  <td className="py-3 pr-3 text-right">
                    {item.account.balance.toLocaleString("ko-KR")}
                  </td>
                  <td className="py-3 pr-3 text-right font-semibold">
                    {formatWon(item.displayValueKrw)}
                  </td>
                  <td className="py-3 pr-3">
                    {item.account.syncStatus} · {item.account.staleStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
