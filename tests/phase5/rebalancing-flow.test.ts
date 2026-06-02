import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/lib/storage/default-state";
import { executeRebalancingPlan } from "@/lib/services/rebalancing-execution-service";
import { generateAndStoreRebalancingPlan } from "@/lib/services/rebalancing-plan-service";
import {
  acceptRebalancingAcknowledgement,
  setLiveRebalancingEnabled
} from "@/lib/services/rebalancing-rule-service";
import { runRebalancingRuleCheck } from "@/lib/services/rebalancing-scheduler-service";
import {
  acceptTradingAcknowledgement,
  activateKillSwitch,
  completeInvestorProfile,
  setLiveTradingEnabled
} from "@/lib/services/trading-profile-service";
import { makeAsset } from "../helpers";
import type { AppState } from "@/lib/types";

function readyState(): AppState {
  let state: AppState = {
    ...createDefaultState(),
    assets: [makeAsset({ assetType: "cash", amount: 20_000_000 })]
  };
  state = completeInvestorProfile(state, {});
  state = acceptTradingAcknowledgement(state, "principal_loss");
  state = acceptRebalancingAcknowledgement(state, "manual_rebalancing");
  return state;
}

describe("phase5 rebalancing flow", () => {
  it("계획 생성 시 스냅샷, 계획, 항목, 이벤트, 감사 로그를 저장한다", () => {
    const result = generateAndStoreRebalancingPlan(readyState());

    expect(result.plan).toBeDefined();
    expect(result.state.rebalancingSnapshots).toHaveLength(1);
    expect(result.state.rebalancingPlans).toHaveLength(1);
    expect(result.state.rebalancingPlanItems.length).toBeGreaterThan(0);
    expect(
      result.state.rebalancingAuditLogs.some(
        (log) => log.eventType === "rebalancing_plan_generated"
      )
    ).toBe(true);
  });

  it("모의 리밸런싱은 주문 제안과 실행 기록을 만든다", () => {
    const generated = generateAndStoreRebalancingPlan(readyState());
    const executed = executeRebalancingPlan(
      generated.state,
      generated.plan?.id ?? "",
      "paper"
    );

    expect(executed.rebalancingExecutions[0].status).toBe("completed");
    expect(executed.orderProposals.length).toBeGreaterThan(0);
    expect(executed.rebalancingPlans[0].status).toBe("paper_executed");
  });

  it("실거래 자동 리밸런싱은 기본값에서 차단된다", () => {
    const generated = generateAndStoreRebalancingPlan(readyState());
    const executed = executeRebalancingPlan(
      generated.state,
      generated.plan?.id ?? "",
      "live_auto"
    );

    expect(executed.rebalancingExecutions[0].status).toBe("blocked");
    expect(
      executed.rebalancingAuditLogs.some(
        (log) => log.eventType === "auto_rebalancing_blocked"
      )
    ).toBe(true);
  });

  it("실거래 리밸런싱은 사용자 확인 전에는 활성화되지 않는다", () => {
    const state = readyState();
    const denied = setLiveRebalancingEnabled(state, true);
    let accepted = acceptTradingAcknowledgement(state, "live_trading");
    accepted = acceptRebalancingAcknowledgement(accepted, "live_rebalancing");
    accepted = setLiveTradingEnabled(accepted, true);
    accepted = setLiveRebalancingEnabled(accepted, true);

    expect(denied.privateTradingFlags.liveRebalancingEnabled).toBe(false);
    expect(accepted.privateTradingFlags.liveRebalancingEnabled).toBe(true);
  });

  it("스케줄러는 드리프트가 기준 안이면 no-op 실행을 기록한다", () => {
    const state: AppState = {
      ...readyState(),
      rebalancingPolicies: [
        {
          ...createDefaultState().rebalancingPolicies[0],
          assetClassThresholdPercent: 1,
          driftThresholdPercent: 1
        }
      ],
      rebalancingRules: [
        {
          ...createDefaultState().rebalancingRules[0],
          enabled: true
        }
      ]
    };
    const checked = runRebalancingRuleCheck(
      state,
      state.rebalancingRules[0].id,
      "manual_check"
    );

    expect(checked.rebalancingSchedulerRuns[0].status).toBe("no_op");
    expect(checked.rebalancingSchedulerRuns[0].noOpReason).toContain(
      "리밸런싱을 실행하지 않았습니다"
    );
  });

  it("중지 스위치는 계획 생성을 차단하고 감사 로그를 남긴다", () => {
    const killed = activateKillSwitch(readyState());
    const result = generateAndStoreRebalancingPlan(killed);

    expect(result.plan).toBeUndefined();
    expect(result.errors).toContain("중지 스위치가 활성화되어 있습니다.");
    expect(
      result.state.rebalancingAuditLogs.some(
        (log) => log.eventType === "rebalancing_kill_switch_blocked"
      )
    ).toBe(true);
  });
});
