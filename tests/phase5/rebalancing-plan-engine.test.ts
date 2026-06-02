import { describe, expect, it } from "vitest";
import { generateRebalancingPlanDraft } from "@/lib/engines/rebalancing-plan-engine";
import { evaluateRebalancingRisk } from "@/lib/engines/rebalancing-risk-engine";
import { createDefaultState } from "@/lib/storage/default-state";
import { makeAsset } from "../helpers";
import type { AppState, RebalancingPlanItem } from "@/lib/types";

function stateWithCash(): AppState {
  return {
    ...createDefaultState(),
    assets: [makeAsset({ assetType: "cash", amount: 20_000_000 })]
  };
}

describe("rebalancing-plan-engine", () => {
  it("현금 우선 매수 계획을 만들고 기본값에서는 매도를 만들지 않는다", () => {
    const state = stateWithCash();
    const result = generateRebalancingPlanDraft(
      state,
      state.rebalancingPolicies[0]
    );

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((item) => item.side === "buy")).toBe(true);
    expect(result.plan.explanation).toContain("현금");
  });

  it("정책에서 매도를 허용한 경우에만 매도 항목을 만든다", () => {
    const state: AppState = {
      ...createDefaultState(),
      assets: [makeAsset({ assetType: "growth", amount: 20_000_000 })],
      rebalancingPolicies: [
        {
          ...createDefaultState().rebalancingPolicies[0],
          allowSellOrders: true
        }
      ]
    };
    const result = generateRebalancingPlanDraft(
      state,
      state.rebalancingPolicies[0]
    );

    expect(result.items.some((item) => item.side === "sell")).toBe(true);
  });

  it("최대 주문금액 초과와 오래된 가격을 위험 점검에서 차단한다", () => {
    const state = stateWithCash();
    const policy = {
      ...state.rebalancingPolicies[0],
      maxTradeAmount: 100_000
    };
    const item: RebalancingPlanItem = {
      id: "item",
      planId: "plan",
      instrumentId: "instrument_spy",
      assetType: "growth",
      side: "buy",
      reason: "테스트",
      currentWeight: 0,
      targetWeight: 0.5,
      driftPercent: -0.5,
      proposedAmount: 500_000,
      estimatedPrice: 100,
      estimatedFee: 500,
      estimatedTotalAmount: 500_500,
      orderType: "limit",
      priority: 1,
      riskWarnings: [],
      blockingReasons: [],
      status: "proposed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const risk = evaluateRebalancingRisk(
      {
        ...state,
        productUniverse: state.productUniverse.map((instrument) =>
          instrument.id === "instrument_spy"
            ? { ...instrument, lastPriceUpdatedAt: "2020-01-01T00:00:00.000Z" }
            : instrument
        )
      },
      policy,
      [item],
      {
        estimatedCashAfter: 19_500_000,
        currentTotalValue: 20_000_000
      }
    );

    expect(risk.allowed).toBe(false);
    expect(risk.blockingReasons.join(" ")).toContain("1회 한도");
    expect(risk.blockingReasons.join(" ")).toContain("오래되었습니다");
  });
});
