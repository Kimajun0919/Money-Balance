import { evaluateRebalancingRisk } from "@/lib/engines/rebalancing-risk-engine";
import { appendAccountAuditLog } from "@/lib/services/account-audit-service";
import { getAccountFreshnessWarnings } from "@/lib/services/account-freshness-service";
import { createId } from "@/lib/services/service-utils";
import type {
  AppState,
  OrderProposal,
  ProductUniverseItem,
  RealRebalancingExecutionMode,
  RealRebalancingOrderBatch,
  RealRebalancingOrderResult,
  RebalancingPlan,
  RebalancingPlanItem,
  RebalancingPolicy
} from "@/lib/types";

export const REAL_REBALANCING_CONFIRMATION_TEXT = "KIS_REAL_ORDER_EXECUTE";

export interface RealBrokerOrderResultInput {
  proposalId: string;
  success: boolean;
  providerOrderId?: string;
  errorMessage?: string;
  rawResponseSnapshot?: Record<string, unknown>;
}

export interface RealRebalancingExecutionReview {
  plan?: RebalancingPlan;
  items: RebalancingPlanItem[];
  buyItems: RebalancingPlanItem[];
  sellItems: RebalancingPlanItem[];
  blockedItems: RebalancingPlanItem[];
  warnings: string[];
  blockingReasons: string[];
  confirmationTextRequired: string;
  stopSwitchActive: boolean;
  canSubmitRealOrders: boolean;
}

function envValue(name: string) {
  if (typeof process === "undefined") return "";
  return process.env[name]?.trim() ?? "";
}

function envBoolean(name: string, fallback = false) {
  const value = envValue(name);
  if (!value) return fallback;
  return ["1", "true", "yes", "y"].includes(value.toLowerCase());
}

function confirmationTextRequired() {
  return envValue("REAL_REBALANCING_CONFIRMATION_TEXT") || REAL_REBALANCING_CONFIRMATION_TEXT;
}

function hoursSince(timestamp?: string, now = new Date()) {
  if (!timestamp) return Number.POSITIVE_INFINITY;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return Number.POSITIVE_INFINITY;
  return (now.getTime() - parsed.getTime()) / (1000 * 60 * 60);
}

function findPlan(state: AppState, planId: string) {
  return state.rebalancingPlans.find((plan) => plan.id === planId);
}

function findPolicy(state: AppState, policyId?: string): RebalancingPolicy | undefined {
  return state.rebalancingPolicies.find((policy) => policy.id === policyId);
}

function findPlanItems(state: AppState, planId: string) {
  return state.rebalancingPlanItems.filter((item) => item.planId === planId);
}

function findProductForItem(
  state: AppState,
  item: RebalancingPlanItem
): ProductUniverseItem | undefined {
  return (
    state.productUniverse.find((product) => product.id === item.instrumentId) ??
    state.productUniverse.find((product) => product.assetType === item.assetType)
  );
}

function toTradingExecutionMode(mode: RealRebalancingExecutionMode) {
  if (mode === "sandbox") return "sandbox" as const;
  if (mode === "manual_real_order" || mode === "real_order_api") {
    return "live" as const;
  }
  return "paper" as const;
}

function hasFreshFxRate(state: AppState, currency: string, now = new Date()) {
  if (currency.toUpperCase() === "KRW") return true;
  return state.fxRateSnapshots.some(
    (rate) =>
      rate.baseCurrency.toUpperCase() === currency.toUpperCase() &&
      rate.quoteCurrency.toUpperCase() === "KRW" &&
      hoursSince(rate.fetchedAt, now) <= 24
  );
}

function instrumentKindBlocked(product?: ProductUniverseItem) {
  if (!product) return false;
  if (
    [
      "crypto",
      "derivative",
      "option",
      "future",
      "leveraged_etf",
      "illiquid_asset"
    ].includes(product.instrumentKind)
  ) {
    return true;
  }
  const name = `${product.instrumentName} ${product.ticker}`.toLowerCase();
  return (
    name.includes("leveraged") ||
    name.includes("inverse") ||
    name.includes("2x") ||
    name.includes("3x")
  );
}

function createProposalFromItem(
  state: AppState,
  plan: RebalancingPlan,
  item: RebalancingPlanItem,
  mode: RealRebalancingExecutionMode,
  submitted: boolean
): OrderProposal {
  const product = findProductForItem(state, item);
  const now = new Date().toISOString();
  const estimatedPrice = item.estimatedPrice || product?.lastPrice || 1;
  const quantity =
    item.proposedQuantity ??
    (estimatedPrice > 0 ? Math.floor(item.proposedAmount / estimatedPrice) : undefined);

  return {
    id: createId("order"),
    recommendationId: plan.id,
    instrumentId: item.instrumentId ?? product?.id ?? item.assetType,
    ticker: product?.ticker ?? item.assetType,
    instrumentName: product?.instrumentName ?? `${item.assetType} 리밸런싱`,
    side: item.side === "sell" ? "sell" : "buy",
    orderType: item.orderType,
    executionMode: toTradingExecutionMode(mode),
    amountKrw: item.proposedAmount,
    quantity,
    limitPrice: item.orderType === "limit" ? estimatedPrice : undefined,
    currency: product?.currency ?? "KRW",
    estimatedPrice,
    estimatedFeesKrw: item.estimatedFee,
    status: submitted ? "submitted" : "proposed",
    riskCheckPassed: item.blockingReasons.length === 0,
    riskCheckMessages: [...item.riskWarnings, ...item.blockingReasons],
    userConfirmedOrder: submitted,
    privateTradingFlagsSnapshot: { ...state.privateTradingFlags },
    createdAt: now,
    confirmedAt: submitted ? now : undefined,
    submittedAt: submitted ? now : undefined
  };
}

export function createOrderProposalsFromApprovedRebalancingPlan(
  state: AppState,
  planId: string,
  mode: RealRebalancingExecutionMode = "simulation"
): { state: AppState; proposals: OrderProposal[]; errors: string[] } {
  const plan = findPlan(state, planId);
  if (!plan) return { state, proposals: [], errors: ["리밸런싱 계획을 찾을 수 없습니다."] };
  if (plan.status !== "approved" && plan.status !== "live_order_proposed") {
    return {
      state,
      proposals: [],
      errors: ["승인된 리밸런싱 계획에서만 주문 제안을 만들 수 있습니다."]
    };
  }
  const items = findPlanItems(state, planId).filter(
    (item) => item.side !== "hold" && item.status !== "blocked"
  );
  const proposals = items.map((item) =>
    createProposalFromItem(state, plan, item, mode, false)
  );
  const nextState: AppState = {
    ...state,
    orderProposals: [...proposals, ...state.orderProposals],
    rebalancingPlanItems: state.rebalancingPlanItems.map((item) =>
      item.planId === planId && item.side !== "hold"
        ? {
            ...item,
            status: "converted_to_order_proposal",
            updatedAt: new Date().toISOString()
          }
        : item
    ),
    rebalancingPlans: state.rebalancingPlans.map((item) =>
      item.id === planId
        ? { ...item, status: "live_order_proposed", updatedAt: new Date().toISOString() }
        : item
    )
  };

  return {
    proposals,
    errors: [],
    state: appendAccountAuditLog(nextState, {
      eventType: "real_order_proposal_created",
      entityType: "rebalancing_plan",
      entityId: planId,
      summary: "승인된 리밸런싱 계획에서 주문 제안을 생성했습니다.",
      metadata: { proposalCount: proposals.length, mode }
    })
  };
}

export function reviewRealRebalancingExecution(
  state: AppState,
  planId: string,
  params: {
    executionMode?: RealRebalancingExecutionMode;
    confirmationText?: string;
    sellOrdersConfirmed?: boolean;
  } = {}
): RealRebalancingExecutionReview {
  const mode = params.executionMode ?? "simulation";
  const plan = findPlan(state, planId);
  const items = plan ? findPlanItems(state, planId) : [];
  const actionableItems = items.filter((item) => item.side !== "hold");
  const buyItems = actionableItems.filter((item) => item.side === "buy");
  const sellItems = actionableItems.filter((item) => item.side === "sell");
  const blockedItems = actionableItems.filter(
    (item) => item.status === "blocked" || item.blockingReasons.length > 0
  );
  const warnings: string[] = [];
  const blockingReasons: string[] = [];
  const realMode = mode === "manual_real_order" || mode === "real_order_api";
  const now = new Date();

  if (!plan) blockingReasons.push("리밸런싱 계획을 찾을 수 없습니다.");
  if (state.privateTradingFlags.killSwitchActive) {
    blockingReasons.push("중지 스위치가 켜져 있어 리밸런싱 주문을 진행할 수 없습니다.");
  }
  if (blockedItems.length > 0) {
    blockingReasons.push("차단된 주문 항목이 있습니다.");
  }
  if (realMode && plan?.status !== "approved" && plan?.status !== "live_order_proposed") {
    blockingReasons.push("실거래 주문은 승인된 계획에서만 진행할 수 있습니다.");
  }

  const policy = plan ? findPolicy(state, plan.policyId) : undefined;
  if (plan && policy) {
    const riskCheck = evaluateRebalancingRisk(state, policy, actionableItems, {
      estimatedCashAfter: plan.estimatedCashAfter,
      currentTotalValue: plan.currentTotalValue,
      ignoreCooldown: true
    });
    warnings.push(...riskCheck.warnings);
    if (!riskCheck.allowed) blockingReasons.push(...riskCheck.blockingReasons);
  }

  for (const item of actionableItems) {
    const product = findProductForItem(state, item);
    if (item.orderType !== "limit" && realMode) {
      blockingReasons.push(`${product?.ticker ?? item.assetType}: 지정가 주문만 허용됩니다.`);
    }
    if (instrumentKindBlocked(product) && realMode) {
      blockingReasons.push(`${product?.ticker ?? item.assetType}: 자동 실거래가 금지된 상품입니다.`);
    }
    if (product && hoursSince(product.lastPriceUpdatedAt, now) > 24) {
      const message = `${product.ticker} 가격 데이터가 24시간보다 오래되었습니다.`;
      if (realMode) blockingReasons.push(message);
      else warnings.push(message);
    }
    if (product && !hasFreshFxRate(state, product.currency, now)) {
      const message = `${product.currency} 환율 데이터가 최신 상태가 아닙니다.`;
      if (realMode) blockingReasons.push(message);
      else warnings.push(message);
    }
  }

  const accountWarnings = getAccountFreshnessWarnings(state, now);
  const staleBalanceWarnings = accountWarnings.filter(
    (warning) =>
      warning.code === "account_balance_stale" ||
      warning.code === "account_sync_failed"
  );
  if (realMode && state.financialAccounts.length === 0) {
    blockingReasons.push("집계된 계좌 잔고 데이터가 없습니다.");
  }
  if (staleBalanceWarnings.length > 0) {
    const messages = staleBalanceWarnings.map((warning) => warning.message);
    if (realMode) blockingReasons.push(...messages);
    else warnings.push(...messages);
  }

  if (realMode) {
    const hasConnectedBroker = state.externalConnections.some(
      (connection) =>
        connection.providerType === "broker" && connection.status === "connected"
    );
    if (!hasConnectedBroker || !state.privateTradingFlags.brokerConnectionActive) {
      blockingReasons.push("활성 증권사 연결과 주문 API 설정이 필요합니다.");
    }
    if (!state.privateTradingFlags.riskProfileCompleted) {
      blockingReasons.push("투자자 프로필 확인이 필요합니다.");
    }
    if (!state.privateTradingFlags.principalLossAcknowledged) {
      blockingReasons.push("원금 손실 가능성 확인이 필요합니다.");
    }
    if (!state.privateTradingFlags.userTradingConsentAccepted) {
      blockingReasons.push("실거래 사용 확인이 필요합니다.");
    }
    if (!state.privateTradingFlags.userRebalancingConsentAccepted) {
      blockingReasons.push("리밸런싱 실거래 확인이 필요합니다.");
    }
    if (params.confirmationText !== confirmationTextRequired()) {
      blockingReasons.push("실거래 주문 확인 문구가 일치하지 않습니다.");
    }
    if (sellItems.length > 0) {
      if (!params.sellOrdersConfirmed) {
        blockingReasons.push("매도 주문은 별도 확인이 필요합니다.");
      }
      if (!envBoolean("ENABLE_REAL_REBALANCING_SELL_ORDERS", false)) {
        blockingReasons.push("실거래 매도 주문 환경변수가 비활성화되어 있습니다.");
      }
    }
  }

  if (mode === "real_order_api") {
    if (!envBoolean("ENABLE_REAL_REBALANCING_EXECUTION", false)) {
      blockingReasons.push("실거래 리밸런싱 API 실행이 기본값으로 차단되어 있습니다.");
    }
    if (!state.privateTradingFlags.liveRebalancingEnabled || !state.privateTradingFlags.liveTradingEnabled) {
      blockingReasons.push("실거래 및 실거래 리밸런싱 기능이 활성화되어야 합니다.");
    }
  }

  return {
    plan,
    items: actionableItems,
    buyItems,
    sellItems,
    blockedItems,
    warnings: [...new Set(warnings)],
    blockingReasons: [...new Set(blockingReasons)],
    confirmationTextRequired: confirmationTextRequired(),
    stopSwitchActive: state.privateTradingFlags.killSwitchActive,
    canSubmitRealOrders: blockingReasons.length === 0
  };
}

function batchStatusForResults(
  mode: RealRebalancingExecutionMode,
  results: RealRebalancingOrderResult[],
  blocked: boolean
): RealRebalancingOrderBatch["status"] {
  if (blocked) return "blocked";
  if (mode === "manual_real_order") return "pending_confirmation";
  const failed = results.filter((result) => result.status === "failed").length;
  if (failed === 0) return "completed";
  if (failed === results.length) return "failed";
  return "partially_failed";
}

function createOrderResult(
  batchId: string,
  proposal: OrderProposal,
  mode: RealRebalancingExecutionMode,
  brokerResult?: RealBrokerOrderResultInput
): RealRebalancingOrderResult {
  const now = new Date().toISOString();
  const failed = brokerResult && !brokerResult.success;
  const simulated = mode === "simulation" || mode === "sandbox";

  return {
    id: createId("realorderresult"),
    realRebalancingOrderBatchId: batchId,
    tradingOrderProposalId: proposal.id,
    providerOrderId: brokerResult?.providerOrderId,
    ticker: proposal.ticker,
    market: proposal.currency === "KRW" ? "KRX" : "OVERSEAS",
    side: proposal.side,
    orderType: proposal.orderType,
    quantity: proposal.quantity,
    limitPrice: proposal.limitPrice,
    estimatedAmountKrw: proposal.amountKrw,
    status: failed ? "failed" : simulated ? "simulated" : "submitted",
    submittedAt: failed ? undefined : now,
    completedAt: simulated || brokerResult?.success ? now : undefined,
    failedAt: failed ? now : undefined,
    errorMessage: brokerResult?.errorMessage,
    rawResponseSnapshot: brokerResult?.rawResponseSnapshot,
    createdAt: now,
    updatedAt: now
  };
}

export function executeRealRebalancingOrders(
  state: AppState,
  params: {
    planId: string;
    executionMode?: RealRebalancingExecutionMode;
    confirmationText?: string;
    sellOrdersConfirmed?: boolean;
    brokerResults?: RealBrokerOrderResultInput[];
  }
): { state: AppState; batch: RealRebalancingOrderBatch; results: RealRebalancingOrderResult[]; review: RealRebalancingExecutionReview } {
  const mode = params.executionMode ?? "simulation";
  const review = reviewRealRebalancingExecution(state, params.planId, {
    executionMode: mode,
    confirmationText: params.confirmationText,
    sellOrdersConfirmed: params.sellOrdersConfirmed
  });
  const plan = review.plan;
  const now = new Date().toISOString();
  const brokerResultByProposalId = new Map(
    (params.brokerResults ?? []).map((result) => [result.proposalId, result])
  );
  const blocked = review.blockingReasons.length > 0;
  const proposalSubmitted =
    !blocked && (mode === "simulation" || mode === "sandbox" || mode === "real_order_api");
  const proposals =
    !plan || blocked
      ? []
      : review.items.map((item) =>
          createProposalFromItem(state, plan, item, mode, proposalSubmitted)
        );
  const batchId = createId("realorderbatch");
  const apiWithoutResults =
    mode === "real_order_api" && !blocked && params.brokerResults === undefined;
  const effectiveBlocked = blocked || apiWithoutResults;
  const results = effectiveBlocked
    ? []
    : proposals.map((proposal, index) =>
        createOrderResult(
          batchId,
          proposal,
          mode,
          brokerResultByProposalId.get(proposal.id) ?? params.brokerResults?.[index]
        )
      );
  const errorMessage = apiWithoutResults
    ? "실제 KIS 주문 API 호출 결과가 제공되지 않아 제출하지 않았습니다."
    : review.blockingReasons.join(" ");
  const batch: RealRebalancingOrderBatch = {
    id: batchId,
    rebalancingPlanId: params.planId,
    tradingOrderProposalIds: proposals.map((proposal) => proposal.id),
    executionMode: mode,
    status: batchStatusForResults(mode, results, effectiveBlocked),
    confirmationTextRequired: confirmationTextRequired(),
    confirmationTextEntered: params.confirmationText,
    submittedAt:
      !effectiveBlocked && mode !== "manual_real_order" ? now : undefined,
    completedAt:
      !effectiveBlocked &&
      (mode === "simulation" || mode === "sandbox" || results.every((result) => result.status !== "failed"))
        ? now
        : undefined,
    failedAt: effectiveBlocked || results.some((result) => result.status === "failed") ? now : undefined,
    errorMessage: errorMessage || undefined,
    totalOrderAmountKrw: proposals.reduce(
      (total, proposal) => total + proposal.amountKrw,
      0
    ),
    buyOrderCount: proposals.filter((proposal) => proposal.side === "buy").length,
    sellOrderCount: proposals.filter((proposal) => proposal.side === "sell").length,
    createdAt: now,
    updatedAt: now
  };
  let nextState: AppState = {
    ...state,
    orderProposals: [...proposals, ...state.orderProposals],
    realRebalancingOrderBatches: [batch, ...state.realRebalancingOrderBatches],
    realRebalancingOrderResults: [
      ...results,
      ...state.realRebalancingOrderResults
    ],
    rebalancingPlans: state.rebalancingPlans.map((item) =>
      item.id === params.planId && !effectiveBlocked
        ? {
            ...item,
            status:
              batch.status === "completed"
                ? "live_executed"
                : batch.status === "partially_failed"
                  ? "partially_executed"
                  : item.status,
            updatedAt: now
          }
        : item
    )
  };

  nextState = appendAccountAuditLog(nextState, {
    eventType: "real_order_confirmation_attempted",
    entityType: "real_rebalancing_order_batch",
    entityId: batch.id,
    summary: "실거래 리밸런싱 주문 확인을 시도했습니다.",
    metadata: {
      mode,
      blocked: effectiveBlocked,
      blockingReasons: review.blockingReasons
    }
  });
  nextState = appendAccountAuditLog(nextState, {
    eventType:
      effectiveBlocked || results.some((result) => result.status === "failed")
        ? "real_order_failed"
        : "real_order_submitted",
    entityType: "real_rebalancing_order_batch",
    entityId: batch.id,
    summary:
      effectiveBlocked
        ? "실거래 리밸런싱 주문이 안전 조건으로 차단되었습니다."
        : "리밸런싱 주문 실행 결과를 저장했습니다.",
    metadata: {
      mode,
      resultCount: results.length,
      errorMessage: batch.errorMessage
    }
  });

  return { state: nextState, batch, results, review };
}
