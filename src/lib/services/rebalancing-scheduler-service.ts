import { calculateRebalancingDrift } from "@/lib/engines/rebalancing-drift-engine";
import { executeRebalancingPlan } from "@/lib/services/rebalancing-execution-service";
import { generateAndStoreRebalancingPlan } from "@/lib/services/rebalancing-plan-service";
import { appendRebalancingEvent } from "@/lib/services/rebalancing-audit-service";
import { createId } from "@/lib/services/service-utils";
import type {
  AppState,
  RebalancingExecutionMode,
  RebalancingMode,
  RebalancingRule,
  RebalancingSchedulerRun,
  RebalancingSchedulerRunType
} from "@/lib/types";

function getCashAmount(state: AppState) {
  return state.assets
    .filter((asset) => asset.assetType === "cash" || asset.assetType === "savings")
    .reduce((sum, asset) => sum + asset.valuationAmountKrw, 0);
}

function modeToExecutionMode(mode: RebalancingMode): RebalancingExecutionMode | null {
  if (mode === "paper_rebalancing") return "paper";
  if (mode === "sandbox_rebalancing") return "sandbox";
  if (mode === "live_manual_rebalancing") return "live_manual";
  if (mode === "live_auto_rebalancing") return "live_auto";
  return null;
}

function cooldownActive(rule: RebalancingRule, now: Date) {
  const reference = rule.lastExecutedAt ?? rule.lastTriggeredAt;
  if (!reference) return false;
  const elapsedHours =
    (now.getTime() - new Date(reference).getTime()) / (1000 * 60 * 60);
  return elapsedHours < rule.cooldownHours;
}

function appendRun(state: AppState, run: RebalancingSchedulerRun): AppState {
  return {
    ...state,
    rebalancingSchedulerRuns: [run, ...state.rebalancingSchedulerRuns]
  };
}

export function runRebalancingRuleCheck(
  state: AppState,
  ruleId: string,
  runType: RebalancingSchedulerRunType = "manual_check"
): AppState {
  const now = new Date();
  const startedAt = now.toISOString();
  const rule = state.rebalancingRules.find((item) => item.id === ruleId);
  if (!rule) return state;
  const policy = state.rebalancingPolicies.find(
    (item) => item.id === rule.policyId
  );
  if (!policy) return state;
  const drift = calculateRebalancingDrift(state, policy);
  const cashTrigger =
    (runType === "cash_trigger_check" || rule.ruleType === "cash_deposit") &&
    rule.contributionTriggerEnabled &&
    getCashAmount(state) >= rule.cashTriggerAmount;

  if (!rule.enabled && runType !== "manual_check") {
    return appendRun(state, {
      id: createId("rebrun"),
      ruleId,
      runType,
      status: "no_op",
      startedAt,
      completedAt: new Date().toISOString(),
      driftDetected: drift.rebalanceNeeded,
      rebalancingNeeded: false,
      noOpReason: "규칙이 비활성화되어 이번 점검에서는 실행하지 않았습니다.",
      rawResultJson: { ruleEnabled: rule.enabled },
      createdAt: startedAt
    });
  }

  if (cooldownActive(rule, now)) {
    const run = appendRun(state, {
      id: createId("rebrun"),
      ruleId,
      runType,
      status: "no_op",
      startedAt,
      completedAt: new Date().toISOString(),
      driftDetected: drift.rebalanceNeeded,
      rebalancingNeeded: false,
      noOpReason:
        "설정된 대기 시간이 지나지 않아 이번 자동 점검에서는 실행하지 않았습니다.",
      rawResultJson: { lastTriggeredAt: rule.lastTriggeredAt },
      createdAt: startedAt
    });
    return appendRebalancingEvent(run, {
      eventType: "no_rebalance_needed",
      ruleId,
      message:
        "설정된 대기 시간이 지나지 않아 이번 자동 점검에서는 실행하지 않았습니다."
    });
  }

  if (!drift.rebalanceNeeded && !cashTrigger) {
    const run = appendRun(state, {
      id: createId("rebrun"),
      ruleId,
      runType,
      status: "no_op",
      startedAt,
      completedAt: new Date().toISOString(),
      driftDetected: false,
      rebalancingNeeded: false,
      noOpReason:
        "현재 포트폴리오 비중이 목표 범위 내에 있어 이번 점검에서는 리밸런싱을 실행하지 않았습니다.",
      rawResultJson: { maxDriftPercent: drift.maxDriftPercent },
      createdAt: startedAt
    });
    return appendRebalancingEvent(run, {
      eventType: "no_rebalance_needed",
      ruleId,
      message:
        "현재 포트폴리오 비중이 목표 범위 내에 있어 이번 점검에서는 리밸런싱을 실행하지 않았습니다."
    });
  }

  const generated = generateAndStoreRebalancingPlan(state, {
    policyId: policy.id,
    ruleId
  });
  let nextState = generated.state;
  let executionId: string | undefined;
  const executionMode = modeToExecutionMode(policy.defaultMode);

  if (generated.plan && executionMode && !rule.requireManualReview) {
    const beforeExecutionCount = nextState.rebalancingExecutions.length;
    nextState = executeRebalancingPlan(nextState, generated.plan.id, executionMode);
    executionId =
      nextState.rebalancingExecutions.length > beforeExecutionCount
        ? nextState.rebalancingExecutions[0]?.id
        : undefined;
  }

  const completedAt = new Date().toISOString();
  nextState = {
    ...nextState,
    rebalancingRules: nextState.rebalancingRules.map((item) =>
      item.id === ruleId
        ? {
            ...item,
            lastCheckedAt: completedAt,
            lastTriggeredAt: completedAt,
            lastExecutedAt: executionId ? completedAt : item.lastExecutedAt,
            updatedAt: completedAt
          }
        : item
    )
  };

  return appendRun(nextState, {
    id: createId("rebrun"),
    ruleId,
    runType,
    status: generated.errors.length > 0 ? "blocked" : "completed",
    startedAt,
    completedAt,
    checkedPortfolioSnapshotId: generated.snapshot?.id,
    driftDetected: drift.rebalanceNeeded,
    rebalancingNeeded: true,
    generatedPlanId: generated.plan?.id,
    executionId,
    failureReason: generated.errors.join(" ") || undefined,
    rawResultJson: {
      maxDriftPercent: drift.maxDriftPercent,
      cashTrigger
    },
    createdAt: startedAt
  });
}

export function runEnabledRebalancingRules(
  state: AppState,
  runType: RebalancingSchedulerRunType = "threshold_check"
): AppState {
  return state.rebalancingRules
    .filter((rule) => rule.enabled)
    .reduce((currentState, rule) => {
      return runRebalancingRuleCheck(currentState, rule.id, runType);
    }, state);
}
