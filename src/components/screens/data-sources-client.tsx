"use client";

import { Clock, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { MetricCard } from "@/components/common/metric-card";
import { useAppState } from "@/hooks/use-app-state";
import { refreshFxRates } from "@/lib/services/fx-rate-service";
import { refreshMarketPrices } from "@/lib/services/market-data-service";
import { summarizeDataFreshness } from "@/lib/services/data-freshness-service";
import { formatKrw } from "@/lib/utils/currency";
import { VALUATION_SOURCE_LABELS } from "@/lib/utils/labels";

function sourceLabel(source?: string) {
  if (!source) return "";
  if (source.includes("market")) return "모의 시세 공급자";
  if (source.includes("fx")) return "모의 환율 공급자";
  if (source.includes("broker")) return "모의 증권사";
  return source;
}

export function DataSourcesClient() {
  const { state, updateState } = useAppState();
  const [busy, setBusy] = useState<"price" | "fx" | null>(null);
  const [message, setMessage] = useState("");
  const freshnessWarnings = useMemo(
    () => summarizeDataFreshness(state).filter((warning) => warning.stale),
    [state]
  );
  const latestPrice = state.marketPriceSnapshots[0];
  const latestFx = state.fxRateSnapshots[0];

  async function refreshPrices() {
    setBusy("price");
    const result = await refreshMarketPrices(state);
    updateState(result.state);
    setMessage(
      `시세 ${result.items.filter((item) => item.price).length}건을 갱신했습니다.`
    );
    setBusy(null);
  }

  async function refreshFx() {
    setBusy("fx");
    const result = await refreshFxRates(state);
    updateState(result.state);
    setMessage(`환율 ${result.rates.length}건을 갱신했습니다.`);
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-mint">데이터 연동 설정</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">
            시세와 환율 데이터 관리
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshPrices}
            disabled={busy !== null}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white disabled:bg-neutral-300"
          >
            <RefreshCw size={17} aria-hidden="true" />
            전체 시세 새로고침
          </button>
          <button
            type="button"
            onClick={refreshFx}
            disabled={busy !== null}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-neutral-700 disabled:bg-neutral-100"
          >
            <RefreshCw size={17} aria-hidden="true" />
            전체 환율 새로고침
          </button>
        </div>
      </div>

      {message ? (
        <p className="rounded-md border border-mint/30 bg-mint/10 px-4 py-3 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="시세 데이터"
          value={latestPrice ? sourceLabel(latestPrice.source) : "모의 공급자 대기"}
          caption={
            latestPrice
              ? `${latestPrice.fetchedAt.slice(0, 16)} 기준`
              : "종목코드와 수량이 있는 자산부터 갱신됩니다."
          }
          icon={<Clock size={20} aria-hidden="true" />}
        />
        <MetricCard
          title="환율 데이터"
          value={latestFx ? sourceLabel(latestFx.source) : "모의 공급자 대기"}
          caption={
            latestFx
              ? `${latestFx.baseCurrency}/${latestFx.quoteCurrency} ${latestFx.rate.toLocaleString("ko-KR")}`
              : "외화 자산이 있을 때 갱신됩니다."
          }
        />
        <MetricCard
          title="신선도 경고"
          value={`${freshnessWarnings.length}건`}
          caption="시세와 환율은 24시간, 증권사 잔고는 7일 기준으로 확인합니다."
        />
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">자산별 데이터 기준</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">자산</th>
                <th className="py-3 pr-3">종목코드</th>
                <th className="py-3 pr-3 text-right">원화 평가금액</th>
                <th className="py-3 pr-3">시세 기준</th>
                <th className="py-3 pr-3">환율 기준</th>
                <th className="py-3 pr-3">평가 출처</th>
              </tr>
            </thead>
            <tbody>
              {state.assets.map((asset) => (
                <tr key={asset.id} className="border-b border-line/70">
                  <td className="py-3 pr-3 font-medium">{asset.assetName}</td>
                  <td className="py-3 pr-3">
                    {asset.ticker ? `${asset.ticker} · ${asset.market}` : "-"}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatKrw(asset.valuationAmountKrw)}
                  </td>
                  <td className="py-3 pr-3">
                    {asset.lastPriceUpdatedAt
                      ? `${sourceLabel(asset.priceSource)} · ${asset.lastPriceUpdatedAt.slice(0, 16)}`
                      : "수동 평가"}
                  </td>
                  <td className="py-3 pr-3">
                    {asset.currency === "KRW"
                      ? "KRW 기준"
                      : asset.lastFxUpdatedAt
                        ? `${sourceLabel(asset.fxSource)} · ${asset.lastFxUpdatedAt.slice(0, 16)}`
                        : "수동 환율"}
                  </td>
                  <td className="py-3 pr-3">
                    {VALUATION_SOURCE_LABELS[asset.valuationSource ?? "manual"]}
                  </td>
                </tr>
              ))}
              {state.assets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500">
                    등록된 자산이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {freshnessWarnings.length > 0 ? (
        <section className="space-y-2">
          {freshnessWarnings.map((warning) => (
            <p
              key={`${warning.assetId}-${warning.type}`}
              className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            >
              {warning.message}
            </p>
          ))}
        </section>
      ) : null}

      <DisclaimerNote />
    </div>
  );
}
