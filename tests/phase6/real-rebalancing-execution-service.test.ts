import { describe, expect, it } from "vitest";
import {
  createOrderProposalsFromApprovedRebalancingPlan,
  executeRealRebalancingOrders
} from "@/lib/services/real-rebalancing-execution-service";
import { createDefaultState } from "@/lib/storage/default-state";
import type {
  AppState,
  RebalancingPlan,
  RebalancingPlanItem
} from "@/lib/types";

const now = "2026-06-02T00:00:00.000Z";

function plan(): RebalancingPlan {
  return {
    id: "plan-phase6",
    policyId: "rebalancing_policy_default",
    snapshotId: "snapshot-phase6",
    planName: "Phase 6 테스트 계획",
    planType: "manual",
    tradingMode: "analysis",
    status: "approved",
    currentTotalValue: 10_000_000,
    estimatedTotalTradeAmount: 100_000,
    estimatedFeeAmount: 100,
    estimatedCashAfter: 1_000_000,
    estimatedCashRatioAfter: 0.1,
    riskScoreBefore: 10,
    riskScoreAfter: 10,
    driftBeforeJson: [],
    driftAfterJson: [],
    summary: "테스트 계획",
    explanation: "테스트",
    warnings: [],
    blockingReasons: [],
    privateTradingFlagsSnapshot: createDefaultState().privateTradingFlags,
    createdAt: now,
    updatedAt: now
  };
}

function item(id = "item-buy", side: "buy" | "sell" = "buy"): RebalancingPlanItem {
  return {
    id,
    planId: "plan-phase6",
    instrumentId: "instrument_krw_cash",
    assetType: "cash",
    side,
    reason: "테스트",
    currentWeight: 0.1,
    targetWeight: 0.2,
    driftPercent: 0.1,
    proposedAmount: 100_000,
    proposedQuantity: 100_000,
    estimatedPrice: 1,
    estimatedFee: 100,
    estimatedTotalAmount: 100_100,
    orderType: "limit",
    priority: 1,
    riskWarnings: [],
    blockingReasons: [],
    status: "proposed",
    createdAt: now,
    updatedAt: now
  };
}

function baseState(): AppState {
  return {
    ...createDefaultState(),
    assets: [],
    rebalancingPlans: [plan()],
    rebalancingPlanItems: [item()],
    orderProposals: [],
    realRebalancingOrderBatches: [],
    realRebalancingOrderResults: [],
    accountAuditLogs: [],
    productUniverse: createDefaultState().productUniverse.map((product) => ({
      ...product,
      lastPriceUpdatedAt: now
    }))
  };
}

function realReadyState(): AppState {
  return {
    ...baseState(),
    externalConnections: [
      {
        id: "broker-connection",
        providerType: "broker",
        providerName: "kis-broker",
        brokerName: "한국투자증권",
        scopes: ["read_holdings", "read_cash", "submit_orders"],
        status: "connected",
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now
      }
    ],
    privateTradingFlags: {
      ...baseState().privateTradingFlags,
      riskProfileCompleted: true,
      principalLossAcknowledged: true,
      userTradingConsentAccepted: true,
      userRebalancingConsentAccepted: true,
      liveTradingEnabled: true,
      liveRebalancingEnabled: true,
      brokerOrderApiConfigured: true,
      brokerConnectionActive: true,
      killSwitchActive: false,
      updatedAt: now
    }
  };
}

describe("phase6 real rebalancing execution", () => {
  it("blocks real execution by default", () => {
    const result = executeRealRebalancingOrders(baseState(), {
      planId: "plan-phase6",
      executionMode: "real_order_api",
      confirmationText: "KIS_REAL_ORDER_EXECUTE"
    });

    expect(result.batch.status).toBe("blocked");
    expect(result.review.blockingReasons.length).toBeGreaterThan(0);
  });

  it("blocks when stop switch is on", () => {
    const state = {
      ...realReadyState(),
      privateTradingFlags: {
        ...realReadyState().privateTradingFlags,
        killSwitchActive: true
      }
    };
    const result = executeRealRebalancingOrders(state, {
      planId: "plan-phase6",
      executionMode: "real_order_api",
      confirmationText: "KIS_REAL_ORDER_EXECUTE"
    });

    expect(result.review.blockingReasons.join(" ")).toContain("중지 스위치");
  });

  it("blocks when price data is stale", () => {
    const state = {
      ...realReadyState(),
      productUniverse: realReadyState().productUniverse.map((product) => ({
        ...product,
        lastPriceUpdatedAt: "2026-05-01T00:00:00.000Z"
      }))
    };
    const result = executeRealRebalancingOrders(state, {
      planId: "plan-phase6",
      executionMode: "real_order_api",
      confirmationText: "KIS_REAL_ORDER_EXECUTE"
    });

    expect(result.review.blockingReasons.join(" ")).toContain("가격 데이터");
  });

  it("blocks when account balance data is stale", () => {
    const state = {
      ...realReadyState(),
      financialAccounts: realReadyState().financialAccounts.map((account) => ({
        ...account,
        lastSyncedAt: "2026-05-01T00:00:00.000Z"
      }))
    };
    const result = executeRealRebalancingOrders(state, {
      planId: "plan-phase6",
      executionMode: "real_order_api",
      confirmationText: "KIS_REAL_ORDER_EXECUTE"
    });

    expect(result.review.blockingReasons.join(" ")).toContain("잔고 데이터");
  });

  it("blocks without or with incorrect confirmation text", () => {
    const missing = executeRealRebalancingOrders(realReadyState(), {
      planId: "plan-phase6",
      executionMode: "manual_real_order"
    });
    const incorrect = executeRealRebalancingOrders(realReadyState(), {
      planId: "plan-phase6",
      executionMode: "manual_real_order",
      confirmationText: "WRONG"
    });

    expect(missing.batch.status).toBe("blocked");
    expect(incorrect.batch.status).toBe("blocked");
  });

  it("blocks sell orders when sell execution is not enabled", () => {
    const state = {
      ...realReadyState(),
      rebalancingPlanItems: [item("item-sell", "sell")]
    };
    const result = executeRealRebalancingOrders(state, {
      planId: "plan-phase6",
      executionMode: "manual_real_order",
      confirmationText: "KIS_REAL_ORDER_EXECUTE",
      sellOrdersConfirmed: true
    });

    expect(result.review.blockingReasons.join(" ")).toContain("매도 주문");
  });

  it("creates order proposals from an approved plan", () => {
    const result = createOrderProposalsFromApprovedRebalancingPlan(baseState(), "plan-phase6");

    expect(result.errors).toHaveLength(0);
    expect(result.proposals).toHaveLength(1);
    expect(result.state.accountAuditLogs[0].eventType).toBe("real_order_proposal_created");
  });

  it("simulation and sandbox execution succeed without real broker calls", () => {
    const simulation = executeRealRebalancingOrders(baseState(), {
      planId: "plan-phase6",
      executionMode: "simulation"
    });
    const sandbox = executeRealRebalancingOrders(baseState(), {
      planId: "plan-phase6",
      executionMode: "sandbox"
    });

    expect(simulation.batch.status).toBe("completed");
    expect(simulation.results[0].status).toBe("simulated");
    expect(sandbox.batch.status).toBe("completed");
  });

  it("saves real API batch and per-order result when explicitly enabled", () => {
    process.env.ENABLE_REAL_REBALANCING_EXECUTION = "true";
    const result = executeRealRebalancingOrders(realReadyState(), {
      planId: "plan-phase6",
      executionMode: "real_order_api",
      confirmationText: "KIS_REAL_ORDER_EXECUTE",
      brokerResults: [{ proposalId: "index-0", success: true, providerOrderId: "kis-1" }]
    });
    delete process.env.ENABLE_REAL_REBALANCING_EXECUTION;

    expect(result.batch.status).toBe("completed");
    expect(result.results).toHaveLength(1);
    expect(result.state.realRebalancingOrderBatches).toHaveLength(1);
    expect(result.state.accountAuditLogs.some((log) => log.eventType === "real_order_submitted")).toBe(true);
  });

  it("saves partial failures without automatic retry", () => {
    process.env.ENABLE_REAL_REBALANCING_EXECUTION = "true";
    const state = {
      ...realReadyState(),
      rebalancingPlanItems: [item("item-a"), item("item-b")]
    };
    const result = executeRealRebalancingOrders(state, {
      planId: "plan-phase6",
      executionMode: "real_order_api",
      confirmationText: "KIS_REAL_ORDER_EXECUTE",
      brokerResults: [
        { proposalId: "index-0", success: true, providerOrderId: "kis-1" },
        { proposalId: "index-1", success: false, errorMessage: "주문 거절" }
      ]
    });
    delete process.env.ENABLE_REAL_REBALANCING_EXECUTION;

    expect(result.batch.status).toBe("partially_failed");
    expect(result.results.filter((entry) => entry.status === "failed")).toHaveLength(1);
    expect(result.batch.errorMessage).toBeUndefined();
  });
});
