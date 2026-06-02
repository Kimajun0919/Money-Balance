import {
  evaluateLiveAutoRebalancingGate,
  evaluateLiveManualRebalancingGate,
  evaluatePaperRebalancingGate,
  evaluateSandboxRebalancingGate
} from "@/lib/safety/private-trading-gate";
import { appendOrderEventLog } from "@/lib/services/trading-audit-service";
import {
  appendRebalancingAuditLog,
  appendRebalancingEvent
} from "@/lib/services/rebalancing-audit-service";
import { evaluateRebalancingRisk } from "@/lib/engines/rebalancing-risk-engine";
import { createId } from "@/lib/services/service-utils";
import type {
  AppState,
  OrderProposal,
  ProductUniverseItem,
  RebalancingExecution,
  RebalancingExecutionMode,
  RebalancingPlan,
  RebalancingPlanItem,
  RebalancingPolicy
} from "@/lib/types";

function findPlan(state: AppState, planId: string) {
  return state.rebalancingPlans.find((plan) => plan.id === planId);
}

function findPolicy(state: AppState, policyId: string) {
  return state.rebalancingPolicies.find((policy) => policy.id === policyId);
}

function findPlanItems(state: AppState, planId: string) {
  return state.rebalancingPlanItems.filter((item) => item.planId === planId);
}

function toTradingMode(mode: RebalancingExecutionMode) {
  if (mode === "sandbox") return "sandbox" as const;
  if (mode === "live_manual" || mode === "live_auto") return "live" as const;
  return "paper" as const;
}

function findProductForItem(
  state: AppState,
  item: RebalancingPlanItem
): ProductUniverseItem | undefined {
  return (
    state.productUniverse.find((instrument) => instrument.id === item.instrumentId) ??
    state.productUniverse.find((instrument) => instrument.assetType === item.assetType)
  );
}

function createOrderProposalFromPlanItem(
  state: AppState,
  plan: RebalancingPlan,
  item: RebalancingPlanItem,
  mode: RebalancingExecutionMode,
  submitted: boolean
): OrderProposal {
  const instrument = findProductForItem(state, item);
  const now = new Date().toISOString();

  return {
    id: createId("order"),
    instrumentId: item.instrumentId ?? instrument?.id ?? item.assetType,
    ticker: instrument?.ticker ?? item.assetType,
    instrumentName: instrument?.instrumentName ?? `${item.assetType} 리밸런싱`,
    side: item.side === "sell" ? "sell" : "buy",
    orderType: item.orderType,
    executionMode: toTradingMode(mode),
    amountKrw: item.proposedAmount,
    quantity: item.proposedQuantity,
    currency: instrument?.currency ?? "KRW",
    estimatedPrice: item.estimatedPrice,
    estimatedFeesKrw: item.estimatedFee,
    status: submitted ? "submitted" : "proposed",
    riskCheckPassed: item.blockingReasons.length === 0,
    riskCheckMessages: item.blockingReasons,
    userConfirmedOrder: false,
    privateTradingFlagsSnapshot: { ...state.privateTradingFlags },
    createdAt: now,
    submittedAt: submitted ? now : undefined,
    recommendationId: plan.id
  };
}

function buildExecution(
  plan: RebalancingPlan,
  mode: RebalancingExecutionMode,
  status: RebalancingExecution["status"],
  params: {
    totalOrdersAttempted: number;
    totalOrdersSuccessful: number;
    totalOrdersFailed: number;
    failureReason?: string;
  }
): RebalancingExecution {
  const now = new Date().toISOString();
  const completed = status === "completed" || status === "partially_completed";

  return {
    id: createId("rebexec"),
    planId: plan.id,
    executionMode: mode,
    status,
    startedAt: now,
    completedAt: completed ? now : undefined,
    failedAt: status === "failed" || status === "blocked" ? now : undefined,
    failureReason: params.failureReason,
    totalOrdersAttempted: params.totalOrdersAttempted,
    totalOrdersSuccessful: params.totalOrdersSuccessful,
    totalOrdersFailed: params.totalOrdersFailed,
    totalTradeAmount: plan.estimatedTotalTradeAmount,
    totalFeeAmount: plan.estimatedFeeAmount,
    cashBefore: Math.max(0, plan.estimatedCashAfter + plan.estimatedTotalTradeAmount),
    cashAfter: plan.estimatedCashAfter,
    riskScoreBefore: plan.riskScoreBefore,
    riskScoreAfter: plan.riskScoreAfter,
    driftBeforeJson: plan.driftBeforeJson,
    driftAfterJson: plan.driftAfterJson,
    rawResultJson: { simulated: mode === "paper", mode },
    createdAt: now,
    updatedAt: now
  };
}

function gateForMode(
  state: AppState,
  mode: RebalancingExecutionMode,
  riskAllowed: boolean
) {
  if (mode === "paper") {
    return evaluatePaperRebalancingGate(state.privateTradingFlags, riskAllowed);
  }
  if (mode === "sandbox") {
    return evaluateSandboxRebalancingGate(state.privateTradingFlags, riskAllowed);
  }
  if (mode === "live_manual") {
    return evaluateLiveManualRebalancingGate(state.privateTradingFlags, riskAllowed);
  }
  return evaluateLiveAutoRebalancingGate(state.privateTradingFlags, {
    strategyRiskLimitsPassed: true,
    riskCheckPassed: riskAllowed
  });
}

export function executeRebalancingPlan(
  state: AppState,
  planId: string,
  mode: RebalancingExecutionMode
): AppState {
  const plan = findPlan(state, planId);
  if (!plan) return state;
  const policy = findPolicy(state, plan.policyId);
  if (!policy) return state;
  const items = findPlanItems(state, planId).filter(
    (item) => item.side !== "hold" && item.status !== "blocked"
  );
  const riskCheck = evaluateRebalancingRisk(state, policy, items, {
    estimatedCashAfter: plan.estimatedCashAfter,
    currentTotalValue: plan.currentTotalValue,
    ignoreCooldown: true
  });
  const gate = gateForMode(state, mode, riskCheck.allowed);

  if (!gate.allowed || mode === "live_auto") {
    const reasons =
      mode === "live_auto"
        ? ["실거래 자동 리밸런싱은 기본적으로 비활성화되어 있습니다.", ...gate.reasons]
        : gate.reasons;
    const execution = buildExecution(plan, mode, "blocked", {
      totalOrdersAttempted: 0,
      totalOrdersSuccessful: 0,
      totalOrdersFailed: items.length,
      failureReason: reasons.join(" ")
    });
    let nextState: AppState = {
      ...state,
      rebalancingExecutions: [execution, ...state.rebalancingExecutions]
    };
    nextState = appendRebalancingEvent(nextState, {
      eventType:
        state.privateTradingFlags.killSwitchActive
          ? "kill_switch_blocked"
          : mode === "live_auto"
            ? "auto_rebalance_blocked"
            : "risk_check_failed",
      planId,
      executionId: execution.id,
      message: reasons.join(" "),
      rawData: { reasons }
    });
    return appendRebalancingAuditLog(nextState, {
      eventType:
        state.privateTradingFlags.killSwitchActive
          ? "rebalancing_kill_switch_blocked"
          : mode === "live_auto"
            ? "auto_rebalancing_blocked"
            : "rebalancing_order_blocked",
      entityType: "rebalancing_execution",
      entityId: execution.id,
      inputJson: { planId, mode },
      outputJson: { reasons },
      riskCheckResult: riskCheck
    });
  }

  const submitted = mode === "paper" || mode === "sandbox";
  const proposals = items.map((item) =>
    createOrderProposalFromPlanItem(state, plan, item, mode, submitted)
  );
  const successfulCount = submitted ? proposals.length : 0;
  const execution = buildExecution(plan, mode, submitted ? "completed" : "pending", {
    totalOrdersAttempted: proposals.length,
    totalOrdersSuccessful: successfulCount,
    totalOrdersFailed: 0
  });
  const itemStatus =
    mode === "paper"
      ? "paper_executed"
      : mode === "sandbox"
        ? "sandbox_executed"
        : "converted_to_order_proposal";
  const planStatus =
    mode === "paper"
      ? "paper_executed"
      : mode === "sandbox"
        ? "sandbox_executed"
        : "live_order_proposed";
  let nextState: AppState = {
    ...state,
    orderProposals: [...proposals, ...state.orderProposals],
    rebalancingExecutions: [execution, ...state.rebalancingExecutions],
    rebalancingPlans: state.rebalancingPlans.map((entry) =>
      entry.id === planId
        ? { ...entry, status: planStatus, updatedAt: new Date().toISOString() }
        : entry
    ),
    rebalancingPlanItems: state.rebalancingPlanItems.map((entry) =>
      entry.planId === planId
        ? { ...entry, status: itemStatus, updatedAt: new Date().toISOString() }
        : entry
    )
  };

  for (const proposal of proposals) {
    nextState = appendOrderEventLog(nextState, {
      eventType: submitted
        ? proposal.executionMode === "paper"
          ? "paper_order_submitted"
          : "sandbox_order_submitted"
        : "order_proposal_created",
      executionMode: proposal.executionMode,
      message: submitted
        ? "리밸런싱 주문을 모의 제출했습니다."
        : "리밸런싱 실거래 주문 제안을 생성했습니다.",
      status: "success",
      orderProposalId: proposal.id,
      instrumentId: proposal.instrumentId,
      ticker: proposal.ticker,
      amountKrw: proposal.amountKrw
    });
  }

  nextState = appendRebalancingEvent(nextState, {
    eventType:
      mode === "paper"
        ? "paper_rebalance_completed"
        : mode === "sandbox"
          ? "sandbox_rebalance_completed"
          : "live_rebalance_proposed",
    planId,
    executionId: execution.id,
    message:
      mode === "live_manual"
        ? "실거래 리밸런싱 주문 제안을 생성했습니다. 실제 주문 전 종목, 수량, 가격, 수수료, 현금 영향, 위험도를 반드시 확인해 주세요."
        : "리밸런싱 실행을 완료했습니다.",
    rawData: { proposalCount: proposals.length }
  });

  return appendRebalancingAuditLog(nextState, {
    eventType:
      mode === "paper"
        ? "paper_rebalancing_executed"
        : mode === "sandbox"
          ? "sandbox_rebalancing_executed"
          : "live_rebalancing_order_submitted",
    entityType: "rebalancing_execution",
    entityId: execution.id,
    inputJson: { planId, mode },
    outputJson: { proposalCount: proposals.length, planStatus },
    riskCheckResult: riskCheck
  });
}
