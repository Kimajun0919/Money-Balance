import { generateRebalancingPlanDraft } from "@/lib/engines/rebalancing-plan-engine";
import { evaluateRebalancingAnalysisGate } from "@/lib/safety/private-trading-gate";
import {
  appendRebalancingAuditLog,
  appendRebalancingEvent
} from "@/lib/services/rebalancing-audit-service";
import type {
  AppState,
  RebalancingPlan,
  RebalancingPlanItem,
  RebalancingPolicy,
  RebalancingRiskCheckResult,
  RebalancingRule,
  RebalancingSnapshot
} from "@/lib/types";

function findPolicy(state: AppState, policyId?: string): RebalancingPolicy {
  return (
    state.rebalancingPolicies.find((policy) => policy.id === policyId) ??
    state.rebalancingPolicies[0]
  );
}

function findRule(state: AppState, ruleId?: string): RebalancingRule | undefined {
  return state.rebalancingRules.find((rule) => rule.id === ruleId);
}

export function generateAndStoreRebalancingPlan(
  state: AppState,
  params: {
    policyId?: string;
    ruleId?: string;
  } = {}
): {
  state: AppState;
  snapshot?: RebalancingSnapshot;
  plan?: RebalancingPlan;
  items: RebalancingPlanItem[];
  riskCheck?: RebalancingRiskCheckResult;
  errors: string[];
} {
  const policy = findPolicy(state, params.policyId);
  const rule = findRule(state, params.ruleId);
  const gate = evaluateRebalancingAnalysisGate(state.privateTradingFlags);

  if (!gate.allowed) {
    const eventState = appendRebalancingEvent(state, {
      eventType: state.privateTradingFlags.killSwitchActive
        ? "kill_switch_blocked"
        : "plan_blocked",
      message: gate.reasons.join(" "),
      rawData: { reasons: gate.reasons }
    });
    return {
      state: appendRebalancingAuditLog(eventState, {
        eventType: state.privateTradingFlags.killSwitchActive
          ? "rebalancing_kill_switch_blocked"
          : "rebalancing_plan_generated",
        entityType: "rebalancing_plan",
        entityId: "blocked",
        inputJson: { policyId: policy.id, ruleId: rule?.id },
        outputJson: { blockedReasons: gate.reasons }
      }),
      items: [],
      errors: gate.reasons
    };
  }

  const result = generateRebalancingPlanDraft(state, policy, rule);
  let nextState: AppState = {
    ...state,
    rebalancingSnapshots: [result.snapshot, ...state.rebalancingSnapshots],
    rebalancingPlans: [result.plan, ...state.rebalancingPlans],
    rebalancingPlanItems: [...result.items, ...state.rebalancingPlanItems]
  };

  nextState = appendRebalancingEvent(nextState, {
    eventType: "snapshot_created",
    planId: result.plan.id,
    ruleId: rule?.id,
    message: "리밸런싱 분석 스냅샷을 저장했습니다.",
    rawData: { snapshotId: result.snapshot.id }
  });
  nextState = appendRebalancingAuditLog(nextState, {
    eventType: "rebalancing_snapshot_created",
    entityType: "rebalancing_snapshot",
    entityId: result.snapshot.id,
    outputJson: { maxDriftPercent: result.snapshot.maxDriftPercent }
  });
  nextState = appendRebalancingEvent(nextState, {
    eventType:
      result.snapshot.maxDriftPercent >= policy.driftThresholdPercent
        ? "drift_detected"
        : "no_rebalance_needed",
    planId: result.plan.id,
    ruleId: rule?.id,
    message:
      result.snapshot.maxDriftPercent >= policy.driftThresholdPercent
        ? "목표비중 대비 드리프트가 감지되었습니다."
        : "현재 포트폴리오 비중이 목표 범위 내에 있습니다.",
    rawData: { maxDriftPercent: result.snapshot.maxDriftPercent }
  });
  nextState = appendRebalancingAuditLog(nextState, {
    eventType: "rebalancing_drift_detected",
    entityType: "rebalancing_snapshot",
    entityId: result.snapshot.id,
    outputJson: {
      drift: result.snapshot.driftJson,
      maxDriftPercent: result.snapshot.maxDriftPercent
    }
  });
  nextState = appendRebalancingEvent(nextState, {
    eventType:
      result.riskCheck.blockingReasons.length > 0 ? "plan_blocked" : "plan_generated",
    planId: result.plan.id,
    ruleId: rule?.id,
    message:
      result.riskCheck.blockingReasons.length > 0
        ? result.riskCheck.blockingReasons.join(" ")
        : "리밸런싱 계획을 생성했습니다.",
    rawData: { itemCount: result.items.length }
  });
  nextState = appendRebalancingAuditLog(nextState, {
    eventType: "rebalancing_plan_generated",
    entityType: "rebalancing_plan",
    entityId: result.plan.id,
    inputJson: { policyId: policy.id, ruleId: rule?.id },
    outputJson: { plan: result.plan, items: result.items },
    riskCheckResult: result.riskCheck
  });

  return {
    state: nextState,
    snapshot: result.snapshot,
    plan: result.plan,
    items: result.items,
    riskCheck: result.riskCheck,
    errors: []
  };
}

export function approveRebalancingPlan(
  state: AppState,
  planId: string
): AppState {
  const now = new Date().toISOString();
  const plan = state.rebalancingPlans.find((item) => item.id === planId);
  if (!plan) return state;
  const nextState: AppState = {
    ...state,
    rebalancingPlans: state.rebalancingPlans.map((item) =>
      item.id === planId
        ? { ...item, status: "approved", updatedAt: now }
        : item
    )
  };

  return appendRebalancingAuditLog(
    appendRebalancingEvent(nextState, {
      eventType: "plan_approved",
      planId,
      statusBefore: plan.status,
      statusAfter: "approved",
      message: "리밸런싱 계획을 승인했습니다."
    }),
    {
      eventType: "rebalancing_plan_approved",
      entityType: "rebalancing_plan",
      entityId: planId,
      inputJson: { statusBefore: plan.status },
      outputJson: { statusAfter: "approved" }
    }
  );
}

export function rejectRebalancingPlan(
  state: AppState,
  planId: string
): AppState {
  const now = new Date().toISOString();
  const plan = state.rebalancingPlans.find((item) => item.id === planId);
  if (!plan) return state;
  const nextState: AppState = {
    ...state,
    rebalancingPlans: state.rebalancingPlans.map((item) =>
      item.id === planId
        ? { ...item, status: "rejected", updatedAt: now }
        : item
    )
  };

  return appendRebalancingAuditLog(
    appendRebalancingEvent(nextState, {
      eventType: "plan_rejected",
      planId,
      statusBefore: plan.status,
      statusAfter: "rejected",
      message: "리밸런싱 계획을 거절했습니다."
    }),
    {
      eventType: "rebalancing_plan_rejected",
      entityType: "rebalancing_plan",
      entityId: planId,
      inputJson: { statusBefore: plan.status },
      outputJson: { statusAfter: "rejected" }
    }
  );
}
