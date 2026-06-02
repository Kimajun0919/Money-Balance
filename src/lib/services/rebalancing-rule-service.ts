import {
  appendRebalancingAuditLog,
  appendRebalancingEvent
} from "@/lib/services/rebalancing-audit-service";
import { createId } from "@/lib/services/service-utils";
import type {
  AppState,
  PrivateTradingFlags,
  RebalancingAcknowledgementType,
  RebalancingPolicy,
  RebalancingRule,
  RebalancingUserAcknowledgement
} from "@/lib/types";

export const REBALANCING_ACKNOWLEDGEMENT_TEXT: Record<
  RebalancingAcknowledgementType,
  string
> = {
  manual_rebalancing:
    "리밸런싱은 수익을 보장하지 않으며 주문 제안은 사용자 검토 후에만 실행됨을 확인했습니다.",
  auto_rebalancing:
    "자동 리밸런싱은 사용자가 설정한 조건과 한도 내에서만 작동하며 언제든 중지할 수 있음을 확인했습니다.",
  sell_order:
    "매도 주문은 보유 자산에 직접 영향을 주며 손익, 수수료, 세금 가능성을 직접 확인해야 함을 확인했습니다.",
  large_order:
    "큰 금액의 리밸런싱 주문은 현금, 위험도, 포트폴리오 구성에 큰 영향을 줄 수 있음을 확인했습니다.",
  live_rebalancing:
    "실거래 리밸런싱 주문은 연결된 본인 증권계좌에 영향을 줄 수 있으며 최종 책임이 본인에게 있음을 확인했습니다."
};

export function updateRebalancingPolicy(
  state: AppState,
  policyId: string,
  updates: Partial<RebalancingPolicy>
): AppState {
  const now = new Date().toISOString();

  return {
    ...state,
    rebalancingPolicies: state.rebalancingPolicies.map((policy) =>
      policy.id === policyId
        ? {
            ...policy,
            ...updates,
            id: policy.id,
            createdAt: policy.createdAt,
            updatedAt: now
          }
        : policy
    )
  };
}

export function createRebalancingRule(
  state: AppState,
  input: Partial<RebalancingRule> & { policyId: string; ruleName: string }
): { state: AppState; rule: RebalancingRule } {
  const now = new Date().toISOString();
  const policy = state.rebalancingPolicies.find(
    (item) => item.id === input.policyId
  );
  const rule: RebalancingRule = {
    id: createId("rebrule"),
    policyId: input.policyId,
    ruleName: input.ruleName,
    enabled: false,
    ruleType: input.ruleType ?? "threshold",
    scheduleCron: input.scheduleCron,
    scheduleTimezone: input.scheduleTimezone ?? "Asia/Seoul",
    driftThresholdPercent:
      input.driftThresholdPercent ?? policy?.driftThresholdPercent ?? 0.03,
    assetClassThresholdPercent:
      input.assetClassThresholdPercent ??
      policy?.assetClassThresholdPercent ??
      0.03,
    instrumentThresholdPercent:
      input.instrumentThresholdPercent ??
      policy?.instrumentThresholdPercent ??
      0.05,
    cashTriggerAmount: input.cashTriggerAmount ?? 500_000,
    contributionTriggerEnabled: input.contributionTriggerEnabled ?? true,
    withdrawalTriggerEnabled: input.withdrawalTriggerEnabled ?? false,
    targetAssetClasses: input.targetAssetClasses ?? [],
    excludedAssetClasses: input.excludedAssetClasses ?? [],
    allowedInstrumentIds: input.allowedInstrumentIds ?? [],
    excludedInstrumentIds: input.excludedInstrumentIds ?? [],
    maxOrderAmount: input.maxOrderAmount ?? policy?.maxTradeAmount ?? 1_000_000,
    maxTotalOrderAmount:
      input.maxTotalOrderAmount ?? policy?.maxTotalRebalanceAmount ?? 3_000_000,
    maxOrdersPerRun:
      input.maxOrdersPerRun ?? policy?.maxOrdersPerRebalance ?? 5,
    maxOrdersPerDay: input.maxOrdersPerDay ?? policy?.maxOrdersPerDay ?? 5,
    minCashRatioAfterTrade:
      input.minCashRatioAfterTrade ??
      policy?.minCashRatioAfterRebalance ??
      0.05,
    maxRiskScoreAfterTrade:
      input.maxRiskScoreAfterTrade ??
      state.privateTradingRiskLimits.maxRiskScoreAfterTrade,
    cooldownHours: input.cooldownHours ?? policy?.cooldownHours ?? 24,
    requireManualReview: input.requireManualReview ?? true,
    createdAt: now,
    updatedAt: now
  };
  const nextState: AppState = {
    ...state,
    rebalancingRules: [rule, ...state.rebalancingRules]
  };

  return {
    state: appendRebalancingAuditLog(nextState, {
      eventType: "auto_rebalancing_rule_created",
      entityType: "rebalancing_rule",
      entityId: rule.id,
      inputJson: input,
      outputJson: { rule }
    }),
    rule
  };
}

export function setRebalancingRuleEnabled(
  state: AppState,
  ruleId: string,
  enabled: boolean
): AppState {
  const now = new Date().toISOString();
  const rule = state.rebalancingRules.find((item) => item.id === ruleId);
  if (!rule) return state;
  const canEnable =
    !enabled ||
    (state.privateTradingFlags.userAutoRebalancingConsentAccepted &&
      state.privateTradingFlags.autoRebalancingRiskAcknowledged);
  const nextState: AppState = {
    ...state,
    rebalancingRules: state.rebalancingRules.map((item) =>
      item.id === ruleId
        ? {
            ...item,
            enabled: canEnable ? enabled : false,
            updatedAt: now
          }
        : item
    )
  };

  return appendRebalancingAuditLog(nextState, {
    eventType: canEnable && enabled
      ? "auto_rebalancing_rule_enabled"
      : "auto_rebalancing_rule_disabled",
    entityType: "rebalancing_rule",
    entityId: ruleId,
    inputJson: { enabled },
    outputJson: { enabled: canEnable ? enabled : false }
  });
}

export function acceptRebalancingAcknowledgement(
  state: AppState,
  acknowledgementType: RebalancingAcknowledgementType
): AppState {
  const now = new Date().toISOString();
  const acknowledgement: RebalancingUserAcknowledgement = {
    id: createId("reback"),
    acknowledgementType,
    accepted: true,
    acceptedAt: now,
    createdAt: now
  };
  const flags: Partial<PrivateTradingFlags> = {};

  if (
    acknowledgementType === "manual_rebalancing" ||
    acknowledgementType === "live_rebalancing"
  ) {
    flags.userRebalancingConsentAccepted = true;
  }
  if (acknowledgementType === "auto_rebalancing") {
    flags.userAutoRebalancingConsentAccepted = true;
    flags.autoRebalancingRiskAcknowledged = true;
  }

  const nextState: AppState = {
    ...state,
    rebalancingUserAcknowledgements: [
      acknowledgement,
      ...state.rebalancingUserAcknowledgements
    ],
    privateTradingFlags: {
      ...state.privateTradingFlags,
      ...flags,
      updatedAt: now
    }
  };

  return appendRebalancingAuditLog(nextState, {
    eventType: "rebalancing_plan_viewed",
    entityType: "rebalancing_acknowledgement",
    entityId: acknowledgement.id,
    inputJson: { acknowledgementType },
    outputJson: { text: REBALANCING_ACKNOWLEDGEMENT_TEXT[acknowledgementType] }
  });
}

export function setLiveRebalancingEnabled(
  state: AppState,
  enabled: boolean
): AppState {
  const now = new Date().toISOString();
  const canEnable =
    !enabled ||
    (state.privateTradingFlags.userTradingConsentAccepted &&
      state.privateTradingFlags.userRebalancingConsentAccepted &&
      state.privateTradingFlags.principalLossAcknowledged);

  return {
    ...state,
    privateTradingFlags: {
      ...state.privateTradingFlags,
      liveRebalancingEnabled: canEnable ? enabled : false,
      updatedAt: now
    }
  };
}

export function setAutoRebalancingEnabled(
  state: AppState,
  enabled: boolean
): AppState {
  const now = new Date().toISOString();
  const canEnable =
    !enabled ||
    (state.privateTradingFlags.userAutoRebalancingConsentAccepted &&
      state.privateTradingFlags.autoRebalancingRiskAcknowledged);

  return {
    ...state,
    privateTradingFlags: {
      ...state.privateTradingFlags,
      autoRebalancingEnabled: canEnable ? enabled : false,
      updatedAt: now
    }
  };
}

export function recordRebalancingNoOp(
  state: AppState,
  ruleId: string | undefined,
  message: string
): AppState {
  return appendRebalancingEvent(state, {
    eventType: "no_rebalance_needed",
    ruleId,
    message
  });
}
