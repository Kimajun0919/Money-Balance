"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ListPlus,
  Play,
  ShieldCheck,
  Square,
  Zap
} from "lucide-react";
import { useMemo, useState } from "react";
import { DisclaimerNote } from "@/components/common/disclaimer-note";
import { MetricCard } from "@/components/common/metric-card";
import { useAppState } from "@/hooks/use-app-state";
import {
  createAutoTradingRuleFromRecommendation,
  setAutoTradingRuleEnabled,
  triggerAutoTradingRule
} from "@/lib/services/auto-trading-service";
import { connectBrokerSandboxOrderApi } from "@/lib/services/broker-sandbox-trading-service";
import {
  confirmOrderProposal,
  createOrderProposalFromRecommendation,
  submitOrderProposal
} from "@/lib/services/order-proposal-service";
import { updateProductUniverseItem } from "@/lib/services/product-universe-service";
import { generateInstrumentRecommendations } from "@/lib/services/recommendation-service";
import {
  acceptTradingAcknowledgement,
  activateKillSwitch,
  completeInvestorProfile,
  deactivateKillSwitch,
  setAutoTradingEnabled,
  setLiveTradingEnabled
} from "@/lib/services/trading-profile-service";
import { addRecommendationToWatchlist } from "@/lib/services/watchlist-service";
import { ASSET_TYPE_SETTINGS } from "@/lib/constants/asset-types";
import type {
  InstrumentRecommendation,
  OrderProposal,
  TradingExecutionMode
} from "@/lib/types";
import type { KisOrderResult } from "@/lib/providers/broker/kis-broker-provider";
import { KIS_BROKER_PROVIDER_NAME } from "@/lib/providers/broker/broker-provider-constants";
import { formatKrw } from "@/lib/utils/currency";
import { formatPercent } from "@/lib/utils/percentage";

const actionLabels: Record<InstrumentRecommendation["action"], string> = {
  buy: "매수 검토",
  hold: "유지",
  reduce: "축소 검토",
  watch: "관찰"
};

const modeLabels: Record<TradingExecutionMode, string> = {
  paper: "모의",
  sandbox: "샌드박스",
  live: "실거래"
};

const proposalStatusLabels = {
  draft: "초안",
  blocked: "차단",
  proposed: "제안",
  confirmed: "확인",
  submitted: "제출",
  canceled: "취소"
};

async function readApiJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? "API 요청에 실패했습니다.");
  }
  return payload as T;
}

export function PrivateTradingClient() {
  const { state, updateState } = useAppState();
  const [message, setMessage] = useState("");
  const [kisOrderConfirmationText, setKisOrderConfirmationText] = useState("");
  const latestRecommendations = useMemo(
    () => state.recommendations.slice(0, 10),
    [state.recommendations]
  );
  const hasConnectedKisBroker = useMemo(
    () =>
      state.externalConnections.some(
        (connection) =>
          connection.status === "connected" &&
          connection.providerName === KIS_BROKER_PROVIDER_NAME
      ),
    [state.externalConnections]
  );

  function update(nextState: typeof state, nextMessage: string) {
    updateState(nextState);
    setMessage(nextMessage);
  }

  function prepareProfile() {
    let nextState = completeInvestorProfile(state, {});
    nextState = acceptTradingAcknowledgement(nextState, "principal_loss");
    update(nextState, "투자자 프로필과 원금 손실 확인을 저장했습니다.");
  }

  function connectSandbox() {
    update(connectBrokerSandboxOrderApi(state), "샌드박스 주문 연결을 활성화했습니다.");
  }

  function enableLiveTrading() {
    let nextState = acceptTradingAcknowledgement(state, "live_trading");
    nextState = setLiveTradingEnabled(nextState, true);
    update(nextState, "실거래 모드 요청을 저장했습니다.");
  }

  function enableAutoTrading() {
    let nextState = acceptTradingAcknowledgement(state, "auto_trading");
    nextState = setAutoTradingEnabled(nextState, true);
    update(nextState, "자동매매 모드 요청을 저장했습니다.");
  }

  function toggleKillSwitch() {
    update(
      state.privateTradingFlags.killSwitchActive
        ? deactivateKillSwitch(state)
        : activateKillSwitch(state),
      state.privateTradingFlags.killSwitchActive
        ? "중지 스위치를 해제했습니다."
        : "중지 스위치를 활성화했습니다."
    );
  }

  function generateRecommendations() {
    const result = generateInstrumentRecommendations(state);
    updateState(result.state);
    setMessage(
      result.blockedReasons.length > 0
        ? result.blockedReasons.join(" ")
        : "개인용 추천을 생성했습니다."
    );
  }

  function createProposal(
    recommendationId: string,
    executionMode: TradingExecutionMode
  ) {
    const result = createOrderProposalFromRecommendation(state, recommendationId, {
      executionMode
    });
    updateState(result.state);
    setMessage(
      result.proposal?.status === "blocked"
        ? result.proposal.riskCheckMessages.join(" ")
        : `${modeLabels[executionMode]} 주문 제안을 생성했습니다.`
    );
  }

  function confirmProposal(proposalId: string) {
    update(confirmOrderProposal(state, proposalId), "주문 제안을 확인했습니다.");
  }

  function toKisOrderRequest(proposal: OrderProposal) {
    const instrument = state.productUniverse.find(
      (item) => item.id === proposal.instrumentId
    );

    return {
      proposalId: proposal.id,
      ticker: proposal.ticker,
      market: instrument?.market,
      currency: proposal.currency,
      side: proposal.side,
      orderType: proposal.orderType,
      amountKrw: proposal.amountKrw,
      quantity: proposal.quantity,
      limitPrice: proposal.limitPrice,
      estimatedPrice: proposal.estimatedPrice,
      userConfirmedOrder: proposal.userConfirmedOrder,
      confirmationText: kisOrderConfirmationText.trim()
    };
  }

  async function submitProposal(proposalId: string) {
    const proposal = state.orderProposals.find((item) => item.id === proposalId);
    if (!proposal) return;

    if (proposal.executionMode === "live" && hasConnectedKisBroker) {
      try {
        const payload = await readApiJson<{ orderResult: KisOrderResult }>(
          await fetch("/api/broker/kis/order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: toKisOrderRequest(proposal) })
          })
        );
        update(
          submitOrderProposal(state, proposalId, {
            brokerOrderResult: payload.orderResult as unknown as Record<
              string,
              unknown
            >,
            message: "KIS 실주문을 제출했습니다."
          }),
          `KIS 실주문 제출 완료: ${payload.orderResult.orderId ?? "주문번호 미제공"}`
        );
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "KIS 실주문 제출에 실패했습니다."
        );
      }
      return;
    }

    update(submitOrderProposal(state, proposalId), "주문 제출 처리를 기록했습니다.");
  }

  function addWatch(recommendationId: string) {
    update(
      addRecommendationToWatchlist(state, recommendationId),
      "관심목록에 추가했습니다."
    );
  }

  function createAutoRule(recommendationId: string) {
    const result = createAutoTradingRuleFromRecommendation(state, recommendationId);
    updateState(result.state);
    setMessage(result.rule ? "자동매매 규칙을 생성했습니다." : result.errors.join(" "));
  }

  function toggleRule(ruleId: string, enabled: boolean) {
    update(
      setAutoTradingRuleEnabled(state, ruleId, enabled),
      enabled ? "자동매매 규칙 활성화를 요청했습니다." : "자동매매 규칙을 껐습니다."
    );
  }

  function triggerRule(ruleId: string) {
    update(triggerAutoTradingRule(state, ruleId), "자동매매 규칙 실행을 기록했습니다.");
  }

  function setInstrumentAutoAllowed(instrumentId: string, allowed: boolean) {
    update(
      updateProductUniverseItem(state, instrumentId, {
        isAutoTradingAllowed: allowed
      }),
      allowed ? "상품별 자동매매 허용을 저장했습니다." : "상품별 자동매매 허용을 해제했습니다."
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-mint">개인용 거래 보조</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">
            안전 게이트와 주문 제안
          </h1>
        </div>
        <button
          type="button"
          onClick={toggleKillSwitch}
          className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white ${
            state.privateTradingFlags.killSwitchActive
              ? "bg-neutral-700"
              : "bg-rose-700"
          }`}
        >
          {state.privateTradingFlags.killSwitchActive ? (
            <Play size={17} aria-hidden="true" />
          ) : (
            <Square size={17} aria-hidden="true" />
          )}
          {state.privateTradingFlags.killSwitchActive ? "중지 해제" : "전체 중지"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="추천"
          value={state.privateTradingFlags.recommendationsEnabled ? "켜짐" : "꺼짐"}
          caption={
            state.privateTradingFlags.riskProfileCompleted &&
            state.privateTradingFlags.principalLossAcknowledged
              ? "프로필 확인 완료"
              : "프로필 확인 필요"
          }
          tone={
            state.privateTradingFlags.riskProfileCompleted &&
            state.privateTradingFlags.principalLossAcknowledged
              ? "mint"
              : "saffron"
          }
          icon={<ShieldCheck size={20} aria-hidden="true" />}
        />
        <MetricCard
          title="모의투자"
          value={state.privateTradingFlags.paperTradingEnabled ? "켜짐" : "꺼짐"}
          caption="실제 주문 없음"
        />
        <MetricCard
          title="실거래"
          value={state.privateTradingFlags.liveTradingEnabled ? "켜짐" : "꺼짐"}
          caption={
            state.privateTradingFlags.userTradingConsentAccepted
              ? "사용자 확인 저장"
              : "사용자 확인 필요"
          }
          tone={state.privateTradingFlags.liveTradingEnabled ? "saffron" : "neutral"}
        />
        <MetricCard
          title="자동매매"
          value={state.privateTradingFlags.autoTradingEnabled ? "켜짐" : "꺼짐"}
          caption={
            state.privateTradingFlags.killSwitchActive
              ? "중지 스위치 활성"
              : `${state.autoTradingRules.length}개 규칙`
          }
          tone={state.privateTradingFlags.killSwitchActive ? "berry" : "neutral"}
        />
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={prepareProfile}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white"
          >
            <CheckCircle2 size={17} aria-hidden="true" />
            프로필 확인
          </button>
          <button
            type="button"
            onClick={connectSandbox}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-neutral-700"
          >
            <ShieldCheck size={17} aria-hidden="true" />
            샌드박스 연결
          </button>
          <button
            type="button"
            onClick={enableLiveTrading}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-neutral-700"
          >
            <AlertTriangle size={17} aria-hidden="true" />
            실거래 확인
          </button>
          <button
            type="button"
            onClick={enableAutoTrading}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-neutral-700"
          >
            <Zap size={17} aria-hidden="true" />
            자동매매 확인
          </button>
          <button
            type="button"
            onClick={generateRecommendations}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white"
          >
            <ListPlus size={17} aria-hidden="true" />
            추천 생성
          </button>
        </div>
        {message ? (
          <p className="mt-4 rounded-md border border-line bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
            {message}
          </p>
        ) : null}
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">상품 유니버스</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">상품</th>
                <th className="py-3 pr-3">자산군</th>
                <th className="py-3 pr-3 text-right">예상수익률</th>
                <th className="py-3 pr-3 text-right">위험점수</th>
                <th className="py-3 pr-3">상태</th>
                <th className="py-3 pr-3 text-right">자동</th>
              </tr>
            </thead>
            <tbody>
              {state.productUniverse.map((item) => (
                <tr key={item.id} className="border-b border-line/70">
                  <td className="py-3 pr-3">
                    <p className="font-semibold text-ink">{item.ticker}</p>
                    <p className="text-xs text-neutral-500">
                      {item.instrumentName} · {item.market}
                    </p>
                  </td>
                  <td className="py-3 pr-3">
                    {ASSET_TYPE_SETTINGS[item.assetType].label}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatPercent(item.expectedReturn)}
                  </td>
                  <td className="py-3 pr-3 text-right">{item.riskScore}점</td>
                  <td className="py-3 pr-3">
                    {item.isTradable ? "거래 가능" : "거래 중지"}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setInstrumentAutoAllowed(item.id, !item.isAutoTradingAllowed)
                      }
                      className={`rounded-md border px-3 py-1 text-xs font-semibold ${
                        item.isAutoTradingAllowed
                          ? "border-mint text-mint"
                          : "border-line text-neutral-600"
                      }`}
                    >
                      {item.isAutoTradingAllowed ? "허용" : "차단"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">추천 기록</h2>
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">순위</th>
                <th className="py-3 pr-3">상품</th>
                <th className="py-3 pr-3">판정</th>
                <th className="py-3 pr-3 text-right">점수</th>
                <th className="py-3 pr-3 text-right">제안 금액</th>
                <th className="py-3 pr-3">근거</th>
                <th className="py-3 pr-3 text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {latestRecommendations.map((recommendation) => (
                <tr key={recommendation.id} className="border-b border-line/70">
                  <td className="py-3 pr-3">{recommendation.rank}</td>
                  <td className="py-3 pr-3">
                    <p className="font-semibold text-ink">{recommendation.ticker}</p>
                    <p className="text-xs text-neutral-500">
                      {recommendation.instrumentName}
                    </p>
                  </td>
                  <td className="py-3 pr-3">
                    {recommendation.blocked
                      ? "차단"
                      : actionLabels[recommendation.action]}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {recommendation.score.toFixed(1)}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatKrw(recommendation.suggestedOrderAmountKrw)}
                  </td>
                  <td className="py-3 pr-3 text-neutral-600">
                    {recommendation.blocked
                      ? recommendation.blockReasons.join(" ")
                      : recommendation.reasons.join(" ")}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => addWatch(recommendation.id)}
                        className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-neutral-700"
                      >
                        관심
                      </button>
                      <button
                        type="button"
                        onClick={() => createProposal(recommendation.id, "paper")}
                        className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-neutral-700"
                      >
                        모의
                      </button>
                      <button
                        type="button"
                        onClick={() => createProposal(recommendation.id, "sandbox")}
                        className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-neutral-700"
                      >
                        샌드박스
                      </button>
                      <button
                        type="button"
                        onClick={() => createProposal(recommendation.id, "live")}
                        className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-neutral-700"
                      >
                        실거래
                      </button>
                      <button
                        type="button"
                        onClick={() => createAutoRule(recommendation.id)}
                        className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-neutral-700"
                      >
                        자동
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {latestRecommendations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-500">
                    추천 기록이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-panel">
        <h2 className="text-lg font-bold text-ink">주문 제안</h2>
        {hasConnectedKisBroker ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
            <label className="block text-sm font-semibold text-amber-950">
              KIS 실주문 최종 확인
              <input
                value={kisOrderConfirmationText}
                onChange={(event) =>
                  setKisOrderConfirmationText(event.target.value)
                }
                className="mt-2 h-10 w-full rounded-md border border-amber-300 bg-white px-3 text-neutral-900"
                placeholder="KIS_REAL_ORDER_EXECUTE"
              />
            </label>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              연결된 한국투자증권 계좌가 있으면 실거래 제출 버튼은 서버 KIS
              주문 route를 호출합니다. 지정가 주문만 허용되며 매도는 별도
              환경변수로 열어야 합니다.
            </p>
          </div>
        ) : null}
        <div className="table-scroll mt-4 overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-neutral-500">
                <th className="py-3 pr-3">상품</th>
                <th className="py-3 pr-3">모드</th>
                <th className="py-3 pr-3 text-right">금액</th>
                <th className="py-3 pr-3">상태</th>
                <th className="py-3 pr-3">위험 점검</th>
                <th className="py-3 pr-3 text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {state.orderProposals.slice(0, 10).map((proposal) => (
                <tr key={proposal.id} className="border-b border-line/70">
                  <td className="py-3 pr-3">
                    <p className="font-semibold text-ink">{proposal.ticker}</p>
                    <p className="text-xs text-neutral-500">
                      {proposal.instrumentName}
                    </p>
                  </td>
                  <td className="py-3 pr-3">
                    {modeLabels[proposal.executionMode]}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    {formatKrw(proposal.amountKrw)}
                  </td>
                  <td className="py-3 pr-3">
                    {proposalStatusLabels[proposal.status]}
                  </td>
                  <td className="py-3 pr-3 text-neutral-600">
                    {proposal.riskCheckMessages.length > 0
                      ? proposal.riskCheckMessages.join(" ")
                      : "통과"}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => confirmProposal(proposal.id)}
                        disabled={proposal.status === "blocked"}
                        className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-neutral-700 disabled:text-neutral-300"
                      >
                        확인
                      </button>
                      <button
                        type="button"
                        onClick={() => submitProposal(proposal.id)}
                        disabled={
                          proposal.status === "blocked" ||
                          (proposal.executionMode === "live" &&
                            hasConnectedKisBroker &&
                            !kisOrderConfirmationText.trim())
                        }
                        className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-neutral-700 disabled:text-neutral-300"
                      >
                        제출
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {state.orderProposals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500">
                    주문 제안이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-md border border-line bg-white p-5 shadow-panel">
          <h2 className="text-lg font-bold text-ink">관심목록</h2>
          <div className="mt-4 space-y-3">
            {state.watchlist.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md border border-line bg-neutral-50 p-3"
              >
                <div>
                  <p className="font-semibold text-ink">{item.ticker}</p>
                  <p className="text-sm text-neutral-500">{item.instrumentName}</p>
                </div>
                <span className="text-sm text-neutral-600">{item.priority}</span>
              </div>
            ))}
            {state.watchlist.length === 0 ? (
              <p className="text-sm text-neutral-500">관심목록이 없습니다.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-md border border-line bg-white p-5 shadow-panel">
          <h2 className="text-lg font-bold text-ink">자동매매 규칙</h2>
          <div className="mt-4 space-y-3">
            {state.autoTradingRules.slice(0, 6).map((rule) => (
              <div
                key={rule.id}
                className="rounded-md border border-line bg-neutral-50 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{rule.name}</p>
                    <p className="text-sm text-neutral-500">
                      {formatKrw(rule.maxOrderAmountKrw)} · {rule.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleRule(rule.id, !rule.enabled)}
                      className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-neutral-700"
                    >
                      {rule.enabled ? "끄기" : "켜기"}
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerRule(rule.id)}
                      className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-neutral-700"
                    >
                      실행
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {state.autoTradingRules.length === 0 ? (
              <p className="text-sm text-neutral-500">자동매매 규칙이 없습니다.</p>
            ) : null}
          </div>
        </section>
      </div>

      <DisclaimerNote />
    </div>
  );
}
