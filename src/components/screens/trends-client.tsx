"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { logKpiEvent } from "@/lib/kpi/event-logger";
import { buildTrendData } from "@/lib/services/trend-service";
import type { PeriodFilter } from "@/lib/types";
import { useAppState } from "@/hooks/use-app-state";
import { PERIOD_FILTER_LABELS } from "@/lib/utils/labels";

const colors = ["#0f766e", "#b7791f", "#9f1239", "#2563eb", "#6d28d9", "#475569"];
const periodOptions: PeriodFilter[] = ["3m", "6m", "12m", "all"];

export function TrendsClient() {
  const { state, loaded } = useAppState();
  const [period, setPeriod] = useState<PeriodFilter>("6m");
  const [mounted, setMounted] = useState(false);
  const trendData = useMemo(() => buildTrendData(state, period), [state, period]);
  const allocationKeys = Object.keys(trendData.allocation[0] ?? {}).filter(
    (key) => key !== "date"
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (loaded) logKpiEvent("trend_dashboard_viewed", { period });
  }, [loaded, period]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-mint">자산군 추이</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">
            스냅샷 기반 변화 그래프
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {periodOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPeriod(option)}
              className={`h-10 rounded-md border px-3 text-sm font-semibold ${
                period === option
                  ? "border-mint bg-mint text-white"
                  : "border-line bg-white text-neutral-700"
              }`}
            >
              {PERIOD_FILTER_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      {!trendData.hasEnoughData ? (
        <section className="rounded-md border border-line bg-white p-6 text-center shadow-panel">
          <p className="text-sm text-neutral-600">{trendData.emptyMessage}</p>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <TrendPanel
          title="총자산 추이"
          data={trendData.totalAssets}
          mounted={mounted}
          valueSuffix="원"
        />
        <TrendPanel
          title="위험점수 추이"
          data={trendData.riskScore}
          mounted={mounted}
          valueSuffix="점"
        />
        <TrendPanel
          title="기대수익률 추이"
          data={trendData.expectedReturn}
          mounted={mounted}
          valueSuffix="%"
        />
        <TrendPanel
          title="목표 괴리 추이"
          data={trendData.targetGap}
          mounted={mounted}
          valueSuffix="%p"
        />
        <TrendPanel
          title="월평균 예상 인컴 추이"
          data={trendData.monthlyIncome}
          mounted={mounted}
          valueSuffix="원"
        />
        <TrendPanel
          title="현금성 자산 비중 추이"
          data={trendData.cashRatio}
          mounted={mounted}
          valueSuffix="%"
        />
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">자산군 비중 추이</h2>
        <div className="mt-4 h-80 w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData.allocation}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dedbd2" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${value}%`} width={44} />
                <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                <Legend />
                {allocationKeys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 rounded-md bg-neutral-50" />
          )}
        </div>
      </section>

      <DisclaimerNote />
    </div>
  );
}

function TrendPanel({
  title,
  data,
  mounted,
  valueSuffix
}: {
  title: string;
  data: Array<{ date: string; value: number }>;
  mounted: boolean;
  valueSuffix: string;
}) {
  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-panel">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <div className="mt-4 h-64 w-full">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dedbd2" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis width={56} />
              <Tooltip
                formatter={(value) =>
                  `${Number(value).toLocaleString("ko-KR", {
                    maximumFractionDigits: 1
                  })}${valueSuffix}`
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#0f766e"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 rounded-md bg-neutral-50" />
        )}
      </div>
    </section>
  );
}
