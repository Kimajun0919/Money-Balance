"use client";

import { AlertTriangle, ShieldCheck, Zap } from "lucide-react";
import { useState } from "react";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { useAppState } from "@/hooks/use-app-state";
import {
  acceptRebalancingAcknowledgement,
  setAutoRebalancingEnabled,
  setLiveRebalancingEnabled,
  updateRebalancingPolicy
} from "@/lib/services/rebalancing-rule-service";
import {
  acceptTradingAcknowledgement,
  activateKillSwitch,
  deactivateKillSwitch,
  setAutoTradingEnabled,
  setLiveTradingEnabled
} from "@/lib/services/trading-profile-service";

export function RebalancingSettings() {
  const { state, updateState } = useAppState();
  const policy = state.rebalancingPolicies[0];
  const [message, setMessage] = useState("");

  function updateNumber(key: keyof typeof policy, value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    updateState(updateRebalancingPolicy(state, policy.id, { [key]: parsed }));
  }

  function updateBoolean(key: keyof typeof policy, value: boolean) {
    updateState(updateRebalancingPolicy(state, policy.id, { [key]: value }));
  }

  function updateMode(value: typeof policy.defaultMode) {
    const tradingMode =
      value === "paper_rebalancing"
        ? "paper"
        : value === "sandbox_rebalancing"
          ? "sandbox"
          : value === "live_manual_rebalancing" ||
              value === "live_auto_rebalancing"
            ? "live"
            : "analysis";
    updateState(
      updateRebalancingPolicy(state, policy.id, {
        defaultMode: value,
        tradingMode
      })
    );
  }

  function enableLive() {
    let nextState = acceptTradingAcknowledgement(state, "live_trading");
    nextState = acceptRebalancingAcknowledgement(nextState, "live_rebalancing");
    nextState = setLiveTradingEnabled(nextState, true);
    nextState = setLiveRebalancingEnabled(nextState, true);
    updateState(nextState);
    setMessage("실거래 리밸런싱 확인을 저장했습니다.");
  }

  function enableAuto() {
    let nextState = acceptTradingAcknowledgement(state, "auto_trading");
    nextState = acceptRebalancingAcknowledgement(nextState, "auto_rebalancing");
    nextState = setAutoTradingEnabled(nextState, true);
    nextState = setAutoRebalancingEnabled(nextState, true);
    updateState(nextState);
    setMessage("자동 리밸런싱 확인을 저장했습니다.");
  }

  function toggleKillSwitch() {
    updateState(
      state.privateTradingFlags.killSwitchActive
        ? deactivateKillSwitch(state)
        : activateKillSwitch(state)
    );
    setMessage(
      state.privateTradingFlags.killSwitchActive
        ? "중지 스위치를 해제했습니다."
        : "중지 스위치를 활성화했습니다."
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-mint">리밸런싱 설정</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">정책과 안전 조건</h1>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">기본 정책</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">실행 모드</span>
            <select
              value={policy.defaultMode}
              onChange={(event) =>
                updateMode(event.target.value as typeof policy.defaultMode)
              }
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
            >
              <option value="analysis_only">분석 전용</option>
              <option value="paper_rebalancing">모의 리밸런싱</option>
              <option value="sandbox_rebalancing">샌드박스</option>
              <option value="live_manual_rebalancing">수동 실거래</option>
              <option value="live_auto_rebalancing">자동 실거래</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">
              자산군 기준
            </span>
            <input
              type="number"
              value={policy.assetClassThresholdPercent}
              step="0.01"
              onChange={(event) =>
                updateNumber("assetClassThresholdPercent", event.target.value)
              }
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">
              최소 주문금액
            </span>
            <input
              type="number"
              value={policy.minTradeAmount}
              onChange={(event) => updateNumber("minTradeAmount", event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">
              1회 주문한도
            </span>
            <input
              type="number"
              value={policy.maxTradeAmount}
              onChange={(event) => updateNumber("maxTradeAmount", event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">
              총 리밸런싱 한도
            </span>
            <input
              type="number"
              value={policy.maxTotalRebalanceAmount}
              onChange={(event) =>
                updateNumber("maxTotalRebalanceAmount", event.target.value)
              }
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">
              대기 시간
            </span>
            <input
              type="number"
              value={policy.cooldownHours}
              onChange={(event) => updateNumber("cooldownHours", event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-line px-3"
            />
          </label>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="flex items-center gap-3 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={policy.preferCashFirst}
              onChange={(event) =>
                updateBoolean("preferCashFirst", event.target.checked)
              }
            />
            현금 우선
          </label>
          <label className="flex items-center gap-3 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={policy.allowSellOrders}
              onChange={(event) =>
                updateBoolean("allowSellOrders", event.target.checked)
              }
            />
            매도 허용
          </label>
          <label className="flex items-center gap-3 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={policy.requireConfirmationForLiveOrders}
              onChange={(event) =>
                updateBoolean(
                  "requireConfirmationForLiveOrders",
                  event.target.checked
                )
              }
            />
            실거래 확인
          </label>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">안전 스위치</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={enableLive}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-neutral-700"
          >
            <AlertTriangle size={17} aria-hidden="true" />
            실거래 확인
          </button>
          <button
            type="button"
            onClick={enableAuto}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-neutral-700"
          >
            <Zap size={17} aria-hidden="true" />
            자동 확인
          </button>
          <button
            type="button"
            onClick={toggleKillSwitch}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-rose-700 px-4 text-sm font-semibold text-white"
          >
            <ShieldCheck size={17} aria-hidden="true" />
            {state.privateTradingFlags.killSwitchActive ? "중지 해제" : "전체 중지"}
          </button>
        </div>
        {message ? (
          <p className="mt-4 rounded-md border border-line bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
            {message}
          </p>
        ) : null}
      </section>

      <DisclaimerNote />
    </div>
  );
}
