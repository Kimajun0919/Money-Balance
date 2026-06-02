import {
  evaluateBrokerSandboxGate,
  evaluateLiveTradingGate,
  evaluatePaperTradingGate
} from "@/lib/safety/private-trading-gate";
import { createId } from "@/lib/services/service-utils";
import { appendOrderEventLog, appendTradingAuditLog } from "@/lib/services/trading-audit-service";
import { evaluateTradeRisk } from "@/lib/services/trade-risk-service";
import type {
  AppState,
  InstrumentRecommendation,
  OrderProposal,
  ProductUniverseItem,
  TradingExecutionMode
} from "@/lib/types";

function getInstrument(state: AppState, instrumentId: string) {
  return state.productUniverse.find((item) => item.id === instrumentId);
}

function getRecommendation(state: AppState, recommendationId: string) {
  return state.recommendations.find((item) => item.id === recommendationId);
}

function getGateMessages(
  state: AppState,
  mode: TradingExecutionMode,
  riskCheckPassed: boolean,
  userConfirmedOrder: boolean,
  requireUserConfirmation = true
) {
  if (mode === "paper") {
    return evaluatePaperTradingGate(state.privateTradingFlags, riskCheckPassed).reasons;
  }
  if (mode === "sandbox") {
    return evaluateBrokerSandboxGate(
      state.privateTradingFlags,
      riskCheckPassed
    ).reasons;
  }
  return evaluateLiveTradingGate(state.privateTradingFlags, {
    tradeRiskCheckPassed: riskCheckPassed,
    userConfirmedOrder: requireUserConfirmation ? userConfirmedOrder : true
  }).reasons;
}

function buildProposal(
  state: AppState,
  recommendation: InstrumentRecommendation,
  instrument: ProductUniverseItem,
  params: {
    amountKrw?: number;
    executionMode: TradingExecutionMode;
  }
): OrderProposal {
  const amountKrw =
    params.amountKrw ??
    recommendation.suggestedOrderAmountKrw ??
    state.privateTradingRiskLimits.maxOrderAmountKrw;
  const side = recommendation.action === "reduce" ? "sell" : "buy";
  const riskCheck = evaluateTradeRisk(state, {
    instrument,
    side,
    amountKrw,
    executionMode: params.executionMode
  });
  const gateMessages = getGateMessages(
    state,
    params.executionMode,
    riskCheck.passed,
    false,
    false
  );
  const riskCheckMessages = [...riskCheck.messages, ...gateMessages];
  const status = riskCheckMessages.length > 0 ? "blocked" : "proposed";
  const orderType = params.executionMode === "live" ? "limit" : "market";
  const limitPrice = orderType === "limit" ? instrument.lastPrice : undefined;
  const quantity =
    instrument.currency === "KRW" && instrument.lastPrice > 0
      ? Math.floor(amountKrw / instrument.lastPrice)
      : undefined;

  return {
    id: createId("order"),
    recommendationId: recommendation.id,
    instrumentId: instrument.id,
    ticker: instrument.ticker,
    instrumentName: instrument.instrumentName,
    side,
    orderType,
    executionMode: params.executionMode,
    amountKrw,
    quantity,
    limitPrice,
    currency: instrument.currency,
    estimatedPrice: instrument.lastPrice,
    estimatedFeesKrw: Math.round(amountKrw * 0.001),
    status,
    riskCheckPassed: riskCheck.passed && gateMessages.length === 0,
    riskCheckMessages,
    userConfirmedOrder: false,
    privateTradingFlagsSnapshot: { ...state.privateTradingFlags },
    createdAt: new Date().toISOString()
  };
}

export function createOrderProposalFromRecommendation(
  state: AppState,
  recommendationId: string,
  params: {
    amountKrw?: number;
    executionMode?: TradingExecutionMode;
  } = {}
): { state: AppState; proposal?: OrderProposal; errors: string[] } {
  const recommendation = getRecommendation(state, recommendationId);
  if (!recommendation) {
    return { state, errors: ["추천 기록을 찾을 수 없습니다."] };
  }
  const instrument = getInstrument(state, recommendation.instrumentId);
  if (!instrument) {
    return { state, errors: ["상품 정보를 찾을 수 없습니다."] };
  }

  const proposal = buildProposal(state, recommendation, instrument, {
    amountKrw: params.amountKrw,
    executionMode: params.executionMode ?? "paper"
  });
  let nextState: AppState = {
    ...state,
    orderProposals: [proposal, ...state.orderProposals]
  };
  nextState = appendOrderEventLog(nextState, {
    eventType:
      proposal.status === "blocked" ? "order_blocked" : "order_proposal_created",
    executionMode: proposal.executionMode,
    message:
      proposal.status === "blocked"
        ? proposal.riskCheckMessages.join(" ")
        : "주문 제안을 생성했습니다.",
    status: proposal.status === "blocked" ? "blocked" : "success",
    orderProposalId: proposal.id,
    instrumentId: proposal.instrumentId,
    ticker: proposal.ticker,
    amountKrw: proposal.amountKrw,
    createdAt: proposal.createdAt
  });
  nextState = appendTradingAuditLog(nextState, {
    eventType:
      proposal.status === "blocked"
        ? "order_blocked"
        : "order_proposal_created",
    entityType: "order_proposal",
    entityId: proposal.id,
    summary:
      proposal.status === "blocked"
        ? "주문 제안이 안전 조건 때문에 차단되었습니다."
        : "주문 제안을 생성했습니다.",
    metadata: {
      ticker: proposal.ticker,
      amountKrw: proposal.amountKrw,
      executionMode: proposal.executionMode,
      messages: proposal.riskCheckMessages
    },
    createdAt: proposal.createdAt
  });

  return {
    state: nextState,
    proposal,
    errors: []
  };
}

export function confirmOrderProposal(
  state: AppState,
  proposalId: string
): AppState {
  const now = new Date().toISOString();
  const proposal = state.orderProposals.find((item) => item.id === proposalId);
  if (!proposal || proposal.status === "blocked") return state;

  const nextState: AppState = {
    ...state,
    orderProposals: state.orderProposals.map((item) =>
      item.id === proposalId
        ? {
            ...item,
            status: "confirmed",
            userConfirmedOrder: true,
            confirmedAt: now
          }
        : item
    )
  };

  return appendTradingAuditLog(
    appendOrderEventLog(nextState, {
      eventType: "order_proposal_confirmed",
      executionMode: proposal.executionMode,
      message: "주문 제안을 확인했습니다.",
      status: "success",
      orderProposalId: proposal.id,
      instrumentId: proposal.instrumentId,
      ticker: proposal.ticker,
      amountKrw: proposal.amountKrw,
      createdAt: now
    }),
    {
      eventType: "order_proposal_confirmed",
      entityType: "order_proposal",
      entityId: proposal.id,
      summary: "주문 제안을 확인했습니다.",
      metadata: { ticker: proposal.ticker, amountKrw: proposal.amountKrw },
      createdAt: now
    }
  );
}

export function submitOrderProposal(
  state: AppState,
  proposalId: string,
  options: {
    brokerOrderResult?: Record<string, unknown>;
    message?: string;
  } = {}
): AppState {
  const now = new Date().toISOString();
  const proposal = state.orderProposals.find((item) => item.id === proposalId);
  if (!proposal) return state;
  const instrument = getInstrument(state, proposal.instrumentId);
  if (!instrument) return state;

  const riskCheck = evaluateTradeRisk(state, {
    instrument,
    side: proposal.side,
    amountKrw: proposal.amountKrw,
    executionMode: proposal.executionMode
  });
  const gateMessages = getGateMessages(
    state,
    proposal.executionMode,
    riskCheck.passed,
    proposal.userConfirmedOrder
  );
  const blockedMessages = [...riskCheck.messages, ...gateMessages];

  if (blockedMessages.length > 0 || proposal.status === "blocked") {
    const blockedState = appendOrderEventLog(state, {
      eventType: "order_blocked",
      executionMode: proposal.executionMode,
      message: blockedMessages.join(" ") || "차단된 주문 제안입니다.",
      status: "blocked",
      orderProposalId: proposal.id,
      instrumentId: proposal.instrumentId,
      ticker: proposal.ticker,
      amountKrw: proposal.amountKrw,
      createdAt: now
    });
    return appendTradingAuditLog(blockedState, {
      eventType: "order_blocked",
      entityType: "order_proposal",
      entityId: proposal.id,
      summary: "주문 제출이 안전 조건 때문에 차단되었습니다.",
      metadata: { messages: blockedMessages, ticker: proposal.ticker },
      createdAt: now
    });
  }

  const eventType =
    proposal.executionMode === "paper"
      ? "paper_order_submitted"
      : proposal.executionMode === "sandbox"
        ? "sandbox_order_submitted"
        : "live_order_submitted";
  const nextState: AppState = {
    ...state,
    orderProposals: state.orderProposals.map((item) =>
      item.id === proposalId
        ? {
            ...item,
            status: "submitted",
            riskCheckPassed: true,
            riskCheckMessages: [],
            submittedAt: now
          }
        : item
    )
  };

  return appendTradingAuditLog(
    appendOrderEventLog(nextState, {
      eventType,
      executionMode: proposal.executionMode,
      message: options.message ?? "주문을 제출했습니다.",
      status: "success",
      orderProposalId: proposal.id,
      instrumentId: proposal.instrumentId,
      ticker: proposal.ticker,
      amountKrw: proposal.amountKrw,
      createdAt: now
    }),
    {
      eventType,
      entityType: "order_proposal",
      entityId: proposal.id,
      summary: "주문을 제출했습니다.",
      metadata: {
        ticker: proposal.ticker,
        amountKrw: proposal.amountKrw,
        executionMode: proposal.executionMode,
        brokerOrderResult: options.brokerOrderResult
      },
      createdAt: now
    }
  );
}
