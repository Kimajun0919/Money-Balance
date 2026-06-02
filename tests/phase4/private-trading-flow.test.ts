import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/lib/storage/default-state";
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
import { generateInstrumentRecommendations } from "@/lib/services/recommendation-service";
import {
  acceptTradingAcknowledgement,
  activateKillSwitch,
  completeInvestorProfile,
  setAutoTradingEnabled,
  setLiveTradingEnabled
} from "@/lib/services/trading-profile-service";
import { addRecommendationToWatchlist } from "@/lib/services/watchlist-service";
import { makeAsset } from "../helpers";
import type { AppState, InstrumentRecommendation } from "@/lib/types";

function readyState() {
  let state: AppState = {
    ...createDefaultState(),
    assets: [makeAsset({ assetType: "cash", amount: 20_000_000 })]
  };
  state = completeInvestorProfile(state, {});
  state = acceptTradingAcknowledgement(state, "principal_loss");
  return state;
}

function firstBuyRecommendation(state: AppState): {
  state: AppState;
  recommendation: InstrumentRecommendation;
} {
  const generated = generateInstrumentRecommendations(state);
  const recommendation = generated.recommendations.find(
    (item) => item.action === "buy" && !item.blocked
  );
  if (!recommendation) throw new Error("매수 추천이 생성되지 않았습니다.");

  return { state: generated.state, recommendation };
}

describe("phase4 private trading flow", () => {
  it("추천 생성, 관심목록 추가, 모의 주문 제출과 감사 로그를 저장한다", () => {
    const generated = firstBuyRecommendation(readyState());
    const watched = addRecommendationToWatchlist(
      generated.state,
      generated.recommendation.id
    );
    const proposalResult = createOrderProposalFromRecommendation(
      watched,
      generated.recommendation.id,
      { executionMode: "paper", amountKrw: 500_000 }
    );
    const submitted = submitOrderProposal(
      proposalResult.state,
      proposalResult.proposal?.id ?? ""
    );

    expect(watched.watchlist).toHaveLength(1);
    expect(proposalResult.proposal?.status).toBe("proposed");
    expect(
      submitted.orderProposals.find(
        (proposal) => proposal.id === proposalResult.proposal?.id
      )?.status
    ).toBe("submitted");
    expect(
      submitted.tradingAuditLogs.some(
        (log) => log.eventType === "paper_order_submitted"
      )
    ).toBe(true);
  });

  it("실거래 주문은 기본값에서 차단되고 명시 조건 충족 후 확인하면 제출된다", () => {
    const generated = firstBuyRecommendation(readyState());
    const blocked = createOrderProposalFromRecommendation(
      generated.state,
      generated.recommendation.id,
      { executionMode: "live", amountKrw: 500_000 }
    );

    expect(blocked.proposal?.status).toBe("blocked");
    expect(blocked.proposal?.riskCheckMessages).toContain(
      "실거래 기능이 꺼져 있습니다."
    );

    let enabledState = acceptTradingAcknowledgement(generated.state, "live_trading");
    enabledState = connectBrokerSandboxOrderApi(enabledState);
    enabledState = setLiveTradingEnabled(enabledState, true);
    const liveProposal = createOrderProposalFromRecommendation(
      enabledState,
      generated.recommendation.id,
      { executionMode: "live", amountKrw: 500_000 }
    );
    const confirmed = confirmOrderProposal(
      liveProposal.state,
      liveProposal.proposal?.id ?? ""
    );
    const submitted = submitOrderProposal(
      confirmed,
      liveProposal.proposal?.id ?? ""
    );

    expect(liveProposal.proposal?.status).toBe("proposed");
    expect(
      submitted.orderProposals.find(
        (proposal) => proposal.id === liveProposal.proposal?.id
      )?.status
    ).toBe("submitted");
    expect(
      submitted.tradingAuditLogs.some(
        (log) => log.eventType === "live_order_submitted"
      )
    ).toBe(true);
  });

  it("중지 스위치가 켜지면 추천과 주문을 차단한다", () => {
    const generated = firstBuyRecommendation(readyState());
    const killed = activateKillSwitch(generated.state);
    const blockedRecommendation = generateInstrumentRecommendations(killed);
    const proposalResult = createOrderProposalFromRecommendation(
      killed,
      generated.recommendation.id,
      { executionMode: "paper", amountKrw: 500_000 }
    );

    expect(blockedRecommendation.recommendations).toHaveLength(0);
    expect(blockedRecommendation.blockedReasons).toContain(
      "중지 스위치가 활성화되어 있습니다."
    );
    expect(proposalResult.proposal?.status).toBe("blocked");
    expect(proposalResult.proposal?.riskCheckMessages).toContain(
      "중지 스위치가 활성화되어 있습니다."
    );
  });

  it("자동매매 규칙은 기본 비활성 상태이며 명시 설정과 상품 허용 후에만 실행된다", () => {
    const generated = firstBuyRecommendation(readyState());
    const created = createAutoTradingRuleFromRecommendation(
      generated.state,
      generated.recommendation.id
    );
    const blockedEnable = setAutoTradingRuleEnabled(
      created.state,
      created.rule?.id ?? "",
      true
    );
    const blockedRule = blockedEnable.autoTradingRules.find(
      (rule) => rule.id === created.rule?.id
    );

    expect(created.rule?.enabled).toBe(false);
    expect(blockedRule?.status).toBe("blocked");

    let enabledState: AppState = {
      ...created.state,
      productUniverse: created.state.productUniverse.map((item) =>
        item.id === created.rule?.instrumentId
          ? { ...item, isAutoTradingAllowed: true }
          : item
      )
    };
    enabledState = acceptTradingAcknowledgement(enabledState, "auto_trading");
    enabledState = connectBrokerSandboxOrderApi(enabledState);
    enabledState = setAutoTradingEnabled(enabledState, true);
    const enabled = setAutoTradingRuleEnabled(
      enabledState,
      created.rule?.id ?? "",
      true
    );
    const triggered = triggerAutoTradingRule(enabled, created.rule?.id ?? "");

    expect(
      enabled.autoTradingRules.find((rule) => rule.id === created.rule?.id)
        ?.status
    ).toBe("enabled");
    expect(
      triggered.tradingAuditLogs.some(
        (log) => log.eventType === "auto_trade_triggered"
      )
    ).toBe(true);
  });
});
