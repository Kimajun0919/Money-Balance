import { evaluateAutoTradingGate } from "@/lib/safety/private-trading-gate";
import { createId } from "@/lib/services/service-utils";
import { appendOrderEventLog, appendTradingAuditLog } from "@/lib/services/trading-audit-service";
import { evaluateTradeRisk } from "@/lib/services/trade-risk-service";
import type {
  AppState,
  AutoTradingRule,
  ProductUniverseItem
} from "@/lib/types";

function findInstrument(state: AppState, instrumentId: string) {
  return state.productUniverse.find((item) => item.id === instrumentId);
}

function strategyRiskLimitsPassed(state: AppState, rule: AutoTradingRule) {
  const limits = state.privateTradingRiskLimits;
  const instrument = findInstrument(state, rule.instrumentId);
  if (!instrument) return false;
  if (!instrument.isAutoTradingAllowed) return false;
  if (rule.maxOrderAmountKrw > limits.maxOrderAmountKrw) return false;
  if (rule.maxDailyOrderAmountKrw > limits.maxDailyOrderAmountKrw) return false;
  if (rule.maxOrdersPerDay > limits.maxOrdersPerDay) return false;
  if (rule.minimumCashRatioAfterTrade < limits.minimumCashRatioAfterTrade) {
    return false;
  }
  if (rule.maxRiskScoreAfterTrade > limits.maxRiskScoreAfterTrade) return false;
  return true;
}

export function createAutoTradingRuleFromRecommendation(
  state: AppState,
  recommendationId: string
): { state: AppState; rule?: AutoTradingRule; errors: string[] } {
  const recommendation = state.recommendations.find(
    (item) => item.id === recommendationId
  );
  if (!recommendation) return { state, errors: ["추천 기록을 찾을 수 없습니다."] };
  const instrument = findInstrument(state, recommendation.instrumentId);
  if (!instrument) return { state, errors: ["상품 정보를 찾을 수 없습니다."] };

  const now = new Date().toISOString();
  const rule: AutoTradingRule = {
    id: createId("autorule"),
    name: `${recommendation.ticker} 목표비중 보정`,
    strategyType: "target_gap",
    instrumentId: recommendation.instrumentId,
    ticker: recommendation.ticker,
    instrumentName: recommendation.instrumentName,
    side: recommendation.action === "reduce" ? "sell" : "buy",
    status: "disabled",
    enabled: false,
    maxOrderAmountKrw: Math.min(
      state.privateTradingRiskLimits.maxOrderAmountKrw,
      recommendation.suggestedOrderAmountKrw || state.privateTradingRiskLimits.maxOrderAmountKrw
    ),
    maxDailyOrderAmountKrw: state.privateTradingRiskLimits.maxDailyOrderAmountKrw,
    maxOrdersPerDay: state.privateTradingRiskLimits.maxOrdersPerDay,
    minimumCashRatioAfterTrade:
      state.privateTradingRiskLimits.minimumCashRatioAfterTrade,
    maxRiskScoreAfterTrade: state.privateTradingRiskLimits.maxRiskScoreAfterTrade,
    privateTradingFlagsSnapshot: { ...state.privateTradingFlags },
    createdAt: now,
    updatedAt: now
  };
  const nextState: AppState = {
    ...state,
    autoTradingRules: [rule, ...state.autoTradingRules]
  };

  return {
    state: appendTradingAuditLog(nextState, {
      eventType: "auto_trading_rule_created",
      entityType: "auto_trading_rule",
      entityId: rule.id,
      summary: "자동매매 규칙을 비활성 상태로 생성했습니다.",
      metadata: { ticker: rule.ticker, instrumentKind: instrument.instrumentKind },
      createdAt: now
    }),
    rule,
    errors: []
  };
}

export function setAutoTradingRuleEnabled(
  state: AppState,
  ruleId: string,
  enabled: boolean
): AppState {
  const now = new Date().toISOString();
  const rule = state.autoTradingRules.find((item) => item.id === ruleId);
  if (!rule) return state;
  const nextRule = {
    ...rule,
    enabled,
    status: enabled ? ("enabled" as const) : ("disabled" as const),
    updatedAt: now
  };
  const canEnable =
    !enabled ||
    (state.privateTradingFlags.autoTradingEnabled &&
      strategyRiskLimitsPassed(state, nextRule));
  const finalRule = canEnable
    ? nextRule
    : {
        ...nextRule,
        enabled: false,
        status: "blocked" as const
      };
  const nextState: AppState = {
    ...state,
    autoTradingRules: state.autoTradingRules.map((item) =>
      item.id === ruleId ? finalRule : item
    )
  };

  return appendTradingAuditLog(nextState, {
    eventType: finalRule.enabled
      ? "auto_trading_rule_enabled"
      : "auto_trading_rule_disabled",
    entityType: "auto_trading_rule",
    entityId: ruleId,
    summary: finalRule.enabled
      ? "자동매매 규칙을 활성화했습니다."
      : "자동매매 규칙을 비활성화했습니다.",
    metadata: { ticker: rule.ticker, blocked: finalRule.status === "blocked" },
    createdAt: now
  });
}

export function triggerAutoTradingRule(
  state: AppState,
  ruleId: string
): AppState {
  const now = new Date().toISOString();
  const rule = state.autoTradingRules.find((item) => item.id === ruleId);
  if (!rule || !rule.enabled) return state;
  const instrument = findInstrument(state, rule.instrumentId);
  if (!instrument) return state;

  const riskCheck = evaluateTradeRisk(state, {
    instrument,
    side: rule.side,
    amountKrw: rule.maxOrderAmountKrw,
    executionMode: "live"
  });
  const strategyPassed = strategyRiskLimitsPassed(state, rule);
  const gate = evaluateAutoTradingGate(state.privateTradingFlags, {
    strategyRiskLimitsPassed: strategyPassed,
    tradeRiskCheckPassed: riskCheck.passed
  });

  if (!gate.allowed) {
    const blockedState = appendOrderEventLog(state, {
      eventType: "order_blocked",
      executionMode: "live",
      message: [...riskCheck.messages, ...gate.reasons].join(" "),
      status: "blocked",
      instrumentId: instrument.id,
      ticker: instrument.ticker,
      amountKrw: rule.maxOrderAmountKrw,
      createdAt: now
    });
    return appendTradingAuditLog(blockedState, {
      eventType: "order_blocked",
      entityType: "auto_trading_rule",
      entityId: rule.id,
      summary: "자동매매 주문이 안전 조건 때문에 차단되었습니다.",
      metadata: {
        ticker: rule.ticker,
        riskMessages: riskCheck.messages,
        gateReasons: gate.reasons
      },
      createdAt: now
    });
  }

  const orderProposalId = createId("autoorder");
  const nextState: AppState = {
    ...state,
    autoTradingRules: state.autoTradingRules.map((item) =>
      item.id === ruleId ? { ...item, lastTriggeredAt: now, updatedAt: now } : item
    ),
    orderProposals: [
      {
        id: orderProposalId,
        instrumentId: instrument.id,
        ticker: instrument.ticker,
        instrumentName: instrument.instrumentName,
        side: rule.side,
        orderType: "market",
        executionMode: "live",
        amountKrw: rule.maxOrderAmountKrw,
        currency: instrument.currency,
        estimatedPrice: instrument.lastPrice,
        estimatedFeesKrw: Math.round(rule.maxOrderAmountKrw * 0.001),
        status: "submitted",
        riskCheckPassed: true,
        riskCheckMessages: [],
        userConfirmedOrder: false,
        privateTradingFlagsSnapshot: { ...state.privateTradingFlags },
        createdAt: now,
        submittedAt: now
      },
      ...state.orderProposals
    ]
  };

  return appendTradingAuditLog(
    appendOrderEventLog(nextState, {
      eventType: "live_order_submitted",
      executionMode: "live",
      message: "승인된 자동매매 규칙으로 주문을 제출했습니다.",
      status: "success",
      orderProposalId,
      instrumentId: instrument.id,
      ticker: instrument.ticker,
      amountKrw: rule.maxOrderAmountKrw,
      createdAt: now
    }),
    {
      eventType: "auto_trade_triggered",
      entityType: "auto_trading_rule",
      entityId: rule.id,
      summary: "자동매매 규칙이 실행되었습니다.",
      metadata: { ticker: rule.ticker, amountKrw: rule.maxOrderAmountKrw },
      createdAt: now
    }
  );
}

export function canEnableAutoTradingRule(
  state: AppState,
  rule: AutoTradingRule,
  instrument?: ProductUniverseItem
) {
  const item = instrument ?? findInstrument(state, rule.instrumentId);
  return Boolean(item?.isAutoTradingAllowed && strategyRiskLimitsPassed(state, rule));
}
