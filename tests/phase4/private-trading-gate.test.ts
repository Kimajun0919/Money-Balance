import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/lib/storage/default-state";
import {
  evaluateAutoTradingGate,
  evaluateLiveTradingGate,
  evaluateRecommendationGate
} from "@/lib/safety/private-trading-gate";

describe("private-trading-gate", () => {
  it("법무 검토 플래그 없이 개인 안전 조건만으로 추천을 허용한다", () => {
    const state = createDefaultState();
    const flags = {
      ...state.privateTradingFlags,
      riskProfileCompleted: true,
      principalLossAcknowledged: true
    };
    const result = evaluateRecommendationGate(flags);

    expect(result.allowed).toBe(true);
    expect(result.reasons).not.toContain("법무 검토가 필요합니다.");
  });

  it("실거래는 기본값에서 차단된다", () => {
    const result = evaluateLiveTradingGate(createDefaultState().privateTradingFlags, {
      tradeRiskCheckPassed: true,
      userConfirmedOrder: true
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("실거래 기능이 꺼져 있습니다.");
  });

  it("자동매매는 사용자 확인과 위험 확인 없이는 차단된다", () => {
    const result = evaluateAutoTradingGate(createDefaultState().privateTradingFlags, {
      strategyRiskLimitsPassed: true,
      tradeRiskCheckPassed: true
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("자동매매 기능이 꺼져 있습니다.");
  });
});
