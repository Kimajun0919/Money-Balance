import type {
  AppState,
  RebalancingAuditEventType,
  RebalancingEvent,
  RebalancingEventType,
  RebalancingRiskCheckResult
} from "@/lib/types";
import { createId } from "@/lib/services/service-utils";

function consentSnapshot(state: AppState) {
  return {
    userTradingConsentAccepted:
      state.privateTradingFlags.userTradingConsentAccepted,
    userAutoTradingConsentAccepted:
      state.privateTradingFlags.userAutoTradingConsentAccepted,
    userRebalancingConsentAccepted:
      state.privateTradingFlags.userRebalancingConsentAccepted,
    userAutoRebalancingConsentAccepted:
      state.privateTradingFlags.userAutoRebalancingConsentAccepted,
    principalLossAcknowledged:
      state.privateTradingFlags.principalLossAcknowledged,
    autoRebalancingRiskAcknowledged:
      state.privateTradingFlags.autoRebalancingRiskAcknowledged
  };
}

export function appendRebalancingEvent(
  state: AppState,
  params: {
    eventType: RebalancingEventType;
    message: string;
    planId?: string;
    ruleId?: string;
    executionId?: string;
    statusBefore?: string;
    statusAfter?: string;
    rawData?: Record<string, unknown>;
    createdAt?: string;
  }
): AppState {
  const createdAt = params.createdAt ?? new Date().toISOString();
  const event: RebalancingEvent = {
    id: createId("rebevent"),
    planId: params.planId,
    ruleId: params.ruleId,
    executionId: params.executionId,
    eventType: params.eventType,
    statusBefore: params.statusBefore,
    statusAfter: params.statusAfter,
    message: params.message,
    rawData: params.rawData ?? {},
    createdAt
  };

  return {
    ...state,
    rebalancingEvents: [event, ...state.rebalancingEvents]
  };
}

export function appendRebalancingAuditLog(
  state: AppState,
  params: {
    eventType: RebalancingAuditEventType;
    entityType: string;
    entityId: string;
    inputJson?: Record<string, unknown>;
    outputJson?: Record<string, unknown>;
    riskCheckResult?: RebalancingRiskCheckResult;
    ipAddress?: string;
    userAgent?: string;
    createdAt?: string;
  }
): AppState {
  const createdAt = params.createdAt ?? new Date().toISOString();

  return {
    ...state,
    rebalancingAuditLogs: [
      {
        id: createId("rebaudit"),
        eventType: params.eventType,
        entityType: params.entityType,
        entityId: params.entityId,
        inputJson: params.inputJson ?? {},
        outputJson: params.outputJson ?? {},
        privateTradingFlagsSnapshot: { ...state.privateTradingFlags },
        riskCheckResult: params.riskCheckResult,
        userConsentSnapshot: consentSnapshot(state),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        createdAt
      },
      ...state.rebalancingAuditLogs
    ]
  };
}
